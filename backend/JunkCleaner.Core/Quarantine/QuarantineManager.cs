using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using JunkCleaner.Core.Models;

namespace JunkCleaner.Core.Quarantine
{
    public class QuarantineManager
    {
        private static readonly string QuarantineDir =
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "JunkCleaner", "Quarantine");

        private static readonly string ManifestPath =
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "JunkCleaner", "quarantine_manifest.json");

        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            WriteIndented = true,
            Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
        };

        // Lock to protect manifest file writes
        private static readonly object _lock = new();

        static QuarantineManager()
        {
            Directory.CreateDirectory(QuarantineDir);
        }

        public static List<QuarantineEntry> LoadManifest()
        {
            try
            {
                lock (_lock)
                {
                    if (!File.Exists(ManifestPath)) return new();
                    var json = File.ReadAllText(ManifestPath);
                    return JsonSerializer.Deserialize<List<QuarantineEntry>>(json, JsonOpts) ?? new();
                }
            }
            catch { return new(); }
        }

        private static void SaveManifest(List<QuarantineEntry> entries)
        {
            lock (_lock)
            {
                var json = JsonSerializer.Serialize(entries, JsonOpts);
                File.WriteAllText(ManifestPath, json);
            }
        }

        /// <summary>Quarantine a batch of files in parallel, then write manifest once.</summary>
        public static (List<QuarantineEntry> succeeded, List<string> failed) QuarantineBatch(
            IEnumerable<JunkFileEntry> junkFiles)
        {
            var succeeded = new ConcurrentBag<QuarantineEntry>();
            var failed = new ConcurrentBag<string>();

            Parallel.ForEach(junkFiles,
                new ParallelOptions { MaxDegreeOfParallelism = Environment.ProcessorCount },
                file =>
                {
                    try
                    {
                        if (!File.Exists(file.FilePath)) { failed.Add(file.Id); return; }

                        var safeFileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FilePath)}";
                        var dest = Path.Combine(QuarantineDir, safeFileName);

                        File.Move(file.FilePath, dest, overwrite: true);

                        succeeded.Add(new QuarantineEntry
                        {
                            OriginalPath = file.FilePath,
                            QuarantinePath = dest,
                            FileName = file.FileName,
                            SizeBytes = file.SizeBytes,
                            Category = file.Category
                        });
                    }
                    catch { failed.Add(file.Id); }
                });

            // Single manifest write for the whole batch
            var manifest = LoadManifest();
            manifest.AddRange(succeeded);
            SaveManifest(manifest);

            return (succeeded.ToList(), failed.ToList());
        }

        // Keep single-file method for backwards compat
        public static QuarantineEntry? QuarantineFile(JunkFileEntry junkFile)
        {
            var (ok, _) = QuarantineBatch(new[] { junkFile });
            return ok.Count > 0 ? ok[0] : null;
        }

        public static bool RestoreFile(string id)
        {
            var manifest = LoadManifest();
            var entry = manifest.Find(e => e.Id == id);
            if (entry == null) return false;

            try
            {
                if (!File.Exists(entry.QuarantinePath)) return false;
                var dir = Path.GetDirectoryName(entry.OriginalPath);
                if (dir != null) Directory.CreateDirectory(dir);
                File.Move(entry.QuarantinePath, entry.OriginalPath, overwrite: false);
                manifest.Remove(entry);
                SaveManifest(manifest);
                return true;
            }
            catch { return false; }
        }

        public static bool PermanentlyDelete(string id)
        {
            var manifest = LoadManifest();
            var entry = manifest.Find(e => e.Id == id);
            if (entry == null) return false;

            try
            {
                if (File.Exists(entry.QuarantinePath)) File.Delete(entry.QuarantinePath);
                manifest.Remove(entry);
                SaveManifest(manifest);
                return true;
            }
            catch { return false; }
        }

        public static long GetQuarantineSize()
        {
            long total = 0;
            foreach (var e in LoadManifest()) total += e.SizeBytes;
            return total;
        }

        /// <summary>Delete all quarantined files and clear the manifest atomically.</summary>
        public static int PurgeAll(List<QuarantineEntry>? entries = null)
        {
            entries ??= LoadManifest();
            int count = 0;
            Parallel.ForEach(entries, e =>
            {
                try
                {
                    if (File.Exists(e.QuarantinePath)) { File.Delete(e.QuarantinePath); Interlocked.Increment(ref count); }
                }
                catch { }
            });
            SaveManifest(new List<QuarantineEntry>()); // wipe manifest
            return count;
        }

        public static void PurgeOldEntries(int days = 30)
        {
            var manifest = LoadManifest();
            var cutoff = DateTime.UtcNow.AddDays(-days);
            var toRemove = manifest.FindAll(e => e.QuarantinedAt < cutoff);
            if (toRemove.Count == 0) return;
            Parallel.ForEach(toRemove, e =>
            {
                try { if (File.Exists(e.QuarantinePath)) File.Delete(e.QuarantinePath); } catch { }
            });
            toRemove.ForEach(e => manifest.Remove(e));
            SaveManifest(manifest);
        }
    }
}
