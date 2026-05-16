using System;
using System.Collections.Generic;

namespace JunkCleaner.Core.Models
{
    public enum JunkCategory
    {
        TempFile,
        Cache,
        OldLog,
        Duplicate,
        UnusedFile
    }

    public class JunkFileEntry
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string FilePath { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public long SizeBytes { get; set; }
        public JunkCategory Category { get; set; }
        public DateTime LastModified { get; set; }
        public string? DuplicateGroupId { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public class ScanSession
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
        public ScanStatus Status { get; set; } = ScanStatus.Running;
        public int TotalFilesScanned { get; set; }
        public int JunkFilesFound { get; set; }
        public long TotalJunkBytes { get; set; }
        public string CurrentFile { get; set; } = string.Empty;
        public int ProgressPercent { get; set; }
        public List<JunkFileEntry> Results { get; set; } = new();
        public string? ErrorMessage { get; set; }

        // Thread-safe backing fields for live update during parallel scan
        public int _junkFilesFound;
        public long _totalJunkBytes;
    }

    public enum ScanStatus
    {
        Running,
        Completed,
        Cancelled,
        Failed
    }

    public class ScanRequest
    {
        public List<string> Directories { get; set; } = new();
        public List<string> ExcludedPaths { get; set; } = new();
        public bool ScanTempFiles { get; set; } = true;
        public bool ScanCacheFiles { get; set; } = true;
        public bool ScanOldLogs { get; set; } = true;
        public bool ScanDuplicates { get; set; } = true;
        public bool ScanUnusedFiles { get; set; } = true;
        public int UnusedFileMonths { get; set; } = 6;
    }

    public class CleanRequest
    {
        public List<string> FileIds { get; set; } = new();
        public string ScanId { get; set; } = string.Empty;
    }

    public class QuarantineEntry
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string OriginalPath { get; set; } = string.Empty;
        public string QuarantinePath { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public long SizeBytes { get; set; }
        public DateTime QuarantinedAt { get; set; } = DateTime.UtcNow;
        public JunkCategory Category { get; set; }
    }

    public class SystemInfo
    {
        public long TotalDiskBytes { get; set; }
        public long FreeDiskBytes { get; set; }
        public long UsedDiskBytes { get; set; }
        public double FreePercent { get; set; }
        public string DriveName { get; set; } = "C:";
    }
}
