using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using JunkCleaner.Core.Detection;
using JunkCleaner.Core.Models;

namespace JunkCleaner.Core.Scanning
{
    public class FileScanner
    {
        private static readonly ConcurrentDictionary<string, ScanSession> _sessions = new();

        public static ScanSession CreateSession() => new ScanSession();

        public static ScanSession? GetSession(string id) =>
            _sessions.TryGetValue(id, out var s) ? s : null;

        public static void StartScan(ScanSession session, ScanRequest request)
        {
            _sessions[session.Id] = session;

            Task.Run(async () =>
            {
                try
                {
                    var directories = request.Directories.Count > 0
                        ? request.Directories
                        : JunkDetector.GetDefaultScanDirectories();

                    // ── PHASE 1: Collect all files quickly ───────────────
                    session.CurrentFile = "Collecting files…";
                    var allFiles = new ConcurrentBag<FileInfo>();

                    await Parallel.ForEachAsync(directories,
                        new ParallelOptions { MaxDegreeOfParallelism = 4 },
                        async (dir, _) =>
                        {
                            await Task.Run(() => CollectFiles(dir, allFiles, request.ExcludedPaths));
                        });

                    var fileList = allFiles.ToList();
                    int total = fileList.Count;
                    if (total == 0)
                    {
                        session.Results = new List<JunkFileEntry>();
                        session.JunkFilesFound = 0;
                        session.TotalJunkBytes = 0;
                        session.Status = ScanStatus.Completed;
                        session.CompletedAt = DateTime.UtcNow;
                        session.ProgressPercent = 100;
                        session.CurrentFile = "No files found";
                        return;
                    }

                    // ── PHASE 2: Size-bucket duplicate detection (fast) ──
                    // Group by size first — files can only be duplicates if same size
                    ConcurrentDictionary<long, ConcurrentBag<string>> sizeGroups = new();

                    if (request.ScanDuplicates)
                    {
                        session.CurrentFile = "Building size index…";
                        foreach (var f in fileList)
                        {
                            if (f.Length > 0 && f.Length < 500_000_000) // skip >500MB
                                sizeGroups.GetOrAdd(f.Length, _ => new ConcurrentBag<string>()).Add(f.FullName);
                        }
                    }

                    // Only hash files that share a size with at least one other file
                    var duplicateCandidatePaths = new HashSet<string>(
                        sizeGroups.Where(g => g.Value.Count > 1)
                                  .SelectMany(g => g.Value),
                        StringComparer.OrdinalIgnoreCase);

                    // hash → first file seen (for duplicate grouping)
                    var hashMap = new ConcurrentDictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    // ── PHASE 3: Classify files in parallel ──────────────
                    int processed = 0;
                    var junkBag = new ConcurrentBag<JunkFileEntry>();

                    await Parallel.ForEachAsync(fileList,
                        new ParallelOptions { MaxDegreeOfParallelism = Environment.ProcessorCount },
                        async (file, ct) =>
                        {
                            if (session.Status == ScanStatus.Cancelled) return;

                            int idx = Interlocked.Increment(ref processed);
                            session.TotalFilesScanned = idx;
                            session.ProgressPercent = (int)((double)idx / total * 100);

                            // Update current file every 50 files to reduce contention
                            if (idx % 50 == 0)
                                session.CurrentFile = file.FullName;

                            try
                            {
                                if (JunkDetector.IsProtectedPath(file.FullName)) return;

                                // Duplicate check (only for candidates with same size)
                                if (request.ScanDuplicates && duplicateCandidatePaths.Contains(file.FullName))
                                {
                                    var hash = ComputeMd5(file.FullName);
                                    if (hash != null)
                                    {
                                        if (!hashMap.TryAdd(hash, file.FullName))
                                        {
                                            // It's a duplicate
                                            var duplicateEntry = new JunkFileEntry
                                            {
                                                FilePath = file.FullName,
                                                FileName = file.Name,
                                                SizeBytes = file.Length,
                                                Category = JunkCategory.Duplicate,
                                                LastModified = file.LastWriteTime,
                                                DuplicateGroupId = hash,
                                                Reason = $"Duplicate of {Path.GetFileName(hashMap[hash])}"
                                            };
                                            junkBag.Add(duplicateEntry);
                                            Interlocked.Increment(ref session._junkFilesFound);
                                            Interlocked.Add(ref session._totalJunkBytes, file.Length);
                                            session.JunkFilesFound = session._junkFilesFound;
                                            session.TotalJunkBytes = session._totalJunkBytes;
                                            return;
                                        }
                                    }
                                }

                                // Junk classification
                                var (isJunk, category, reason) = JunkDetector.Evaluate(file, request.UnusedFileMonths);

                                bool include = isJunk && category switch
                                {
                                    JunkCategory.TempFile   => request.ScanTempFiles,
                                    JunkCategory.Cache      => request.ScanCacheFiles,
                                    JunkCategory.OldLog     => request.ScanOldLogs,
                                    JunkCategory.UnusedFile => request.ScanUnusedFiles,
                                    _                       => true
                                };

                                if (include)
                                {
                                    junkBag.Add(new JunkFileEntry
                                    {
                                        FilePath = file.FullName,
                                        FileName = file.Name,
                                        SizeBytes = file.Length,
                                        Category = category,
                                        LastModified = file.LastWriteTime,
                                        Reason = reason
                                    });
                                    // Update live counts so the progress screen shows real-time data
                                    Interlocked.Increment(ref session._junkFilesFound);
                                    Interlocked.Add(ref session._totalJunkBytes, file.Length);
                                    session.JunkFilesFound = session._junkFilesFound;
                                    session.TotalJunkBytes = session._totalJunkBytes;
                                }
                            }
                            catch { /* skip inaccessible files */ }

                            await Task.CompletedTask; // satisfy async signature
                        });

                    // Commit results
                    session.Results = junkBag.ToList();
                    session.JunkFilesFound = session.Results.Count;
                    session.TotalJunkBytes = session.Results.Sum(r => r.SizeBytes);
                    session.Status = session.Status == ScanStatus.Cancelled
                        ? ScanStatus.Cancelled : ScanStatus.Completed;
                    session.CompletedAt = DateTime.UtcNow;
                    session.ProgressPercent = 100;
                    session.CurrentFile = "Done";
                }
                catch (Exception ex)
                {
                    session.Status = ScanStatus.Failed;
                    session.ErrorMessage = ex.Message;
                    session.CompletedAt = DateTime.UtcNow;
                }
            });
        }

        public static void CancelScan(string sessionId)
        {
            if (_sessions.TryGetValue(sessionId, out var session))
                session.Status = ScanStatus.Cancelled;
        }

        private static void CollectFiles(string directory, ConcurrentBag<FileInfo> files, List<string> excludedPaths)
        {
            try
            {
                if (excludedPaths.Exists(e => directory.StartsWith(e, StringComparison.OrdinalIgnoreCase)))
                    return;

                var di = new DirectoryInfo(directory);
                foreach (var file in di.GetFiles())
                    files.Add(file);

                foreach (var sub in di.GetDirectories())
                {
                    if (JunkDetector.IsProtectedPath(sub.FullName)) continue;
                    if (excludedPaths.Exists(e => sub.FullName.StartsWith(e, StringComparison.OrdinalIgnoreCase))) continue;
                    CollectFiles(sub.FullName, files, excludedPaths);
                }
            }
            catch { /* access denied — skip */ }
        }

        private static string? ComputeMd5(string filePath)
        {
            try
            {
                // For large files, only hash first 1MB as a fast approximation
                using var stream = File.OpenRead(filePath);
                using var md5 = MD5.Create();

                if (stream.Length > 1_000_000)
                {
                    var buffer = new byte[1_000_000];
                    int read = stream.Read(buffer, 0, buffer.Length);
                    return Convert.ToHexString(md5.ComputeHash(buffer.AsSpan(0, read).ToArray()))
                           + "_" + stream.Length; // include length to avoid false positives
                }

                return Convert.ToHexString(md5.ComputeHash(stream));
            }
            catch { return null; }
        }
    }
}
