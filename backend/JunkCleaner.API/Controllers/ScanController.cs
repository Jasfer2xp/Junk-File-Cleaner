using JunkCleaner.Core.Models;
using JunkCleaner.Core.Quarantine;
using JunkCleaner.Core.Scanning;
using Microsoft.AspNetCore.Mvc;

namespace JunkCleaner.API.Controllers
{
    [ApiController]
    [Route("api")]
    public class ScanController : ControllerBase
    {
        [HttpGet("system/info")]
        public ActionResult<SystemInfo> GetSystemInfo()
        {
            var drive = new System.IO.DriveInfo("C");
            return Ok(new SystemInfo
            {
                DriveName = drive.Name,
                TotalDiskBytes = drive.TotalSize,
                FreeDiskBytes = drive.AvailableFreeSpace,
                UsedDiskBytes = drive.TotalSize - drive.AvailableFreeSpace,
                FreePercent = Math.Round((double)drive.AvailableFreeSpace / drive.TotalSize * 100, 2)
            });
        }

        [HttpPost("scan/start")]
        public ActionResult<object> StartScan([FromBody] ScanRequest? request)
        {
            request ??= new ScanRequest();
            var session = FileScanner.CreateSession();
            FileScanner.StartScan(session, request);
            return Ok(new { scanId = session.Id });
        }

        [HttpGet("scan/status/{id}")]
        public ActionResult<object> GetStatus(string id)
        {
            var session = FileScanner.GetSession(id);
            if (session == null) return NotFound(new { error = "Scan session not found" });

            return Ok(new
            {
                scanId = session.Id,
                status = session.Status.ToString(),
                progressPercent = session.ProgressPercent,
                totalFilesScanned = session.TotalFilesScanned,
                junkFilesFound = session.JunkFilesFound,
                totalJunkBytes = session.TotalJunkBytes,
                currentFile = session.CurrentFile,
                startedAt = session.StartedAt,
                completedAt = session.CompletedAt,
                errorMessage = session.ErrorMessage
            });
        }

        [HttpGet("results/{id}")]
        public ActionResult<object> GetResults(string id)
        {
            var session = FileScanner.GetSession(id);
            if (session == null) return NotFound(new { error = "Scan session not found" });

            return Ok(new
            {
                scanId = session.Id,
                status = session.Status.ToString(),
                totalJunkBytes = session.TotalJunkBytes,
                junkFilesFound = session.JunkFilesFound,
                results = session.Results
            });
        }

        [HttpPost("scan/cancel/{id}")]
        public IActionResult CancelScan(string id)
        {
            FileScanner.CancelScan(id);
            return Ok(new { message = "Scan cancellation requested" });
        }

        [HttpPost("clean")]
        public ActionResult<object> CleanFiles([FromBody] CleanRequest request)
        {
            var session = FileScanner.GetSession(request.ScanId);
            if (session == null) return NotFound(new { error = "Scan session not found" });

            var cleaned = new List<object>();
            var failed = new List<object>();

            foreach (var fileId in request.FileIds)
            {
                var junkFile = session.Results.Find(r => r.Id == fileId);
                if (junkFile == null) { failed.Add(new { id = fileId, reason = "Not found" }); continue; }

                var entry = QuarantineManager.QuarantineFile(junkFile);
                if (entry != null)
                    cleaned.Add(new { id = fileId, quarantineId = entry.Id, fileName = entry.FileName });
                else
                    failed.Add(new { id = fileId, reason = "Could not quarantine (file may be in use or already removed)" });
            }

            return Ok(new { cleaned, failed, cleanedCount = cleaned.Count, failedCount = failed.Count });
        }
    }
}
