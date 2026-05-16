using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using JunkCleaner.Core.Models;

namespace JunkCleaner.Core.Detection
{
    public static class JunkDetector
    {
        private static readonly HashSet<string> TempExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".tmp", ".temp", ".bak", ".old", ".gid", ".chk", ".dmp"
        };

        private static readonly HashSet<string> LogExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".log", ".trace"
        };

        private static readonly HashSet<string> CacheExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".cache", ".dat", ".db-shm", ".db-wal"
        };

        private static readonly string[] TempDirectoryKeywords = new[]
        {
            "\\temp\\", "\\tmp\\", "\\cache\\", "\\caches\\",
            "\\thumbnailcache", "\\prefetch\\"
        };

        private static readonly string[] BrowserCachePaths = new[]
        {
            "Google\\Chrome\\User Data\\Default\\Cache",
            "Google\\Chrome\\User Data\\Default\\Code Cache",
            "Mozilla\\Firefox\\Profiles",
            "Microsoft\\Edge\\User Data\\Default\\Cache",
            "Microsoft\\Edge\\User Data\\Default\\Code Cache",
            "Opera Software\\Opera Stable\\Cache",
            "BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache"
        };

        private static readonly string[] ProtectedPaths = new[]
        {
            Environment.GetFolderPath(Environment.SpecialFolder.System),
            Environment.GetFolderPath(Environment.SpecialFolder.SystemX86),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles)),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86)),
        };

        public static bool IsProtectedPath(string path)
        {
            return ProtectedPaths.Any(p =>
                !string.IsNullOrEmpty(p) &&
                path.StartsWith(p, StringComparison.OrdinalIgnoreCase));
        }

        public static (bool isJunk, JunkCategory category, string reason) Evaluate(
            FileInfo file,
            int unusedFileMonths = 6)
        {
            var ext = file.Extension.ToLowerInvariant();
            var pathLower = file.FullName.ToLowerInvariant();

            // Temp files by extension
            if (TempExtensions.Contains(file.Extension))
                return (true, JunkCategory.TempFile, $"Temporary file extension ({file.Extension})");

            // Old logs
            if (LogExtensions.Contains(file.Extension))
            {
                if (file.LastWriteTime < DateTime.Now.AddDays(-30))
                    return (true, JunkCategory.OldLog, $"Log file older than 30 days");
            }

            // Cache by extension
            if (CacheExtensions.Contains(file.Extension))
                return (true, JunkCategory.Cache, $"Cache file extension ({file.Extension})");

            // Files inside Temp directories
            if (TempDirectoryKeywords.Any(k => pathLower.Contains(k)))
                return (true, JunkCategory.TempFile, "Located in temporary directory");

            // Browser cache paths
            var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var roaming = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            foreach (var cachePath in BrowserCachePaths)
            {
                var fullCachePath1 = Path.Combine(localAppData, cachePath);
                var fullCachePath2 = Path.Combine(roaming, cachePath);
                if (file.FullName.StartsWith(fullCachePath1, StringComparison.OrdinalIgnoreCase) ||
                    file.FullName.StartsWith(fullCachePath2, StringComparison.OrdinalIgnoreCase))
                    return (true, JunkCategory.Cache, "Browser cache file");
            }

            // Unused files (not modified in N months)
            if (file.LastWriteTime < DateTime.Now.AddMonths(-unusedFileMonths))
                return (true, JunkCategory.UnusedFile, $"Not modified in {unusedFileMonths}+ months");

            return (false, JunkCategory.TempFile, string.Empty);
        }

        public static List<string> GetDefaultScanDirectories()
        {
            var dirs = new List<string>();

            // Windows Temp
            var winTemp = Path.GetTempPath();
            if (Directory.Exists(winTemp)) dirs.Add(winTemp);

            // LocalAppData Temp
            var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var localTemp = Path.Combine(localAppData, "Temp");
            if (Directory.Exists(localTemp) && !dirs.Contains(localTemp, StringComparer.OrdinalIgnoreCase))
                dirs.Add(localTemp);

            // Browser caches
            foreach (var cachePath in BrowserCachePaths)
            {
                var full = Path.Combine(localAppData, cachePath);
                if (Directory.Exists(full)) dirs.Add(full);
            }

            return dirs;
        }
    }
}
