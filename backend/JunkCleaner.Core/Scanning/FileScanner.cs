using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
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

                    // Collect all files first for progress tracking
                    var allFiles = new List<FileInfo>();
                    foreach (var dir in directories)
                    {
                        if (!Directory.Exists(dir)) continue;
                        CollectFiles(dir, allFiles, request.ExcludedPaths);
                    }

                    session.TotalFilesScanned = 0;
                    var hashMap = new Dictionary<string, string>(); // hash -> first file path

                    for (int i = 0; i < allFiles.Count; i++)
                    {
                        if (session.Status == ScanStatus.Cancelled) break;

                        var file = allFiles[i];
                        session.CurrentFile = file.FullName;
                        session.TotalFilesScanned++;
                        session.ProgressPercent = (int)((double)(i + 1) / allFiles.Count * 100);

                        try
                        {
                            if (JunkDetector.IsProtectedPath(file.FullName)) continue;

                            // Duplicate detection
                            if (request.ScanDuplicates && file.Length > 0)
                            {
                                var hash = ComputeMd5(file.FullName);
                                if (hash != null)
                                {
                                    if (hashMap.TryGetValue(hash, out var original))
                                    {
                                        var entry = new JunkFileEntry
                                        {
                                            FilePath = file.FullName,
                                            FileName = file.Name,
                                            SizeBytes = file.Length,
                                            Category = JunkCategory.Duplicate,
                                            LastModified = file.LastWriteTime,
                                            DuplicateGroupId = hash,
                                            Reason = $"Duplicate of {Path.GetFileName(original)}"
                                        };
                                        session.Results.Add(entry);
                                        session.JunkFilesFound++;
                                        session.TotalJunkBytes += file.Length;
                                        continue;
                                    }
                                    else
                                    {
                                        hashMap[hash] = file.FullName;
                                    }
                                }
                            }

                            var (isJunk, category, reason) = JunkDetector.Evaluate(file, request.UnusedFileMonths);

                            bool include = isJunk && category switch
                            {
                                JunkCategory.TempFile => request.ScanTempFiles,
                                JunkCategory.Cache => request.ScanCacheFiles,
                                JunkCategory.OldLog => request.ScanOldLogs,
                                JunkCategory.UnusedFile => request.ScanUnusedFiles,
                                _ => true
                            };

                            if (include)
                            {
                                var entry = new JunkFileEntry
                                {
                                    FilePath = file.FullName,
                                    FileName = file.Name,
                                    SizeBytes = file.Length,
                                    Category = category,
                                    LastModified = file.LastWriteTime,
                                    Reason = reason
                                };
                                session.Results.Add(entry);
                                session.JunkFilesFound++;
                                session.TotalJunkBytes += file.Length;
                            }
                        }
                        catch { /* skip inaccessible files */ }

                        // Small yield to stay responsive
                        if (i % 100 == 0) await Task.Delay(1);
                    }

                    session.Status = session.Status == ScanStatus.Cancelled
                        ? ScanStatus.Cancelled
                        : ScanStatus.Completed;
                    session.CompletedAt = DateTime.UtcNow;
                    session.ProgressPercent = 100;
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

        private static void CollectFiles(string directory, List<FileInfo> files, List<string> excludedPaths)
        {
            try
            {
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
                using var md5 = MD5.Create();
                using var stream = File.OpenRead(filePath);
                var hash = md5.ComputeHash(stream);
                return Convert.ToHexString(hash);
            }
            catch { return null; }
        }
    }
}
