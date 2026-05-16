using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
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

        private static readonly JsonSerializerOptions JsonOpts = new() { WriteIndented = true };

        static QuarantineManager()
        {
            Directory.CreateDirectory(QuarantineDir);
        }

        public static List<QuarantineEntry> LoadManifest()
        {
            try
            {
                if (!File.Exists(ManifestPath)) return new();
                var json = File.ReadAllText(ManifestPath);
                return JsonSerializer.Deserialize<List<QuarantineEntry>>(json) ?? new();
            }
            catch { return new(); }
        }

        private static void SaveManifest(List<QuarantineEntry> entries)
        {
            var json = JsonSerializer.Serialize(entries, JsonOpts);
            File.WriteAllText(ManifestPath, json);
        }

        public static QuarantineEntry? QuarantineFile(JunkFileEntry junkFile)
        {
            try
            {
                if (!File.Exists(junkFile.FilePath)) return null;

                var safeFileName = $"{Guid.NewGuid()}_{Path.GetFileName(junkFile.FilePath)}";
                var dest = Path.Combine(QuarantineDir, safeFileName);

                File.Move(junkFile.FilePath, dest, overwrite: true);

                var entry = new QuarantineEntry
                {
                    OriginalPath = junkFile.FilePath,
                    QuarantinePath = dest,
                    FileName = junkFile.FileName,
                    SizeBytes = junkFile.SizeBytes,
                    Category = junkFile.Category
                };

                var manifest = LoadManifest();
                manifest.Add(entry);
                SaveManifest(manifest);

                return entry;
            }
            catch { return null; }
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
                if (File.Exists(entry.QuarantinePath))
                    File.Delete(entry.QuarantinePath);

                manifest.Remove(entry);
                SaveManifest(manifest);
                return true;
            }
            catch { return false; }
        }

        public static long GetQuarantineSize()
        {
            var manifest = LoadManifest();
            long total = 0;
            foreach (var e in manifest)
                total += e.SizeBytes;
            return total;
        }

        public static void PurgeOldEntries(int days = 30)
        {
            var manifest = LoadManifest();
            var cutoff = DateTime.UtcNow.AddDays(-days);
            var toRemove = manifest.FindAll(e => e.QuarantinedAt < cutoff);
            foreach (var e in toRemove)
            {
                try { if (File.Exists(e.QuarantinePath)) File.Delete(e.QuarantinePath); } catch { }
                manifest.Remove(e);
            }
            SaveManifest(manifest);
        }
    }
}
