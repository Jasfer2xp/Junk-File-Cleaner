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
            var drive = System.IO.DriveInfo.GetDrives()
                .FirstOrDefault(d => d.IsReady && d.Name.StartsWith("C", StringComparison.OrdinalIgnoreCase))
                ?? System.IO.DriveInfo.GetDrives().FirstOrDefault(d => d.IsReady);

            if (drive == null)
                return StatusCode(503, new { error = "No ready disk drive was found." });

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

            // Use HashSet for O(1) lookup — critical when cleaning thousands of files
            var fileIdSet = new HashSet<string>(request.FileIds, StringComparer.OrdinalIgnoreCase);
            var toClean = session.Results.FindAll(r => fileIdSet.Contains(r.Id));
            var notFound = request.FileIds
                .FindAll(id => !session.Results.Exists(r => r.Id == id))
                .Select(id => new { id, reason = "Not found in scan session" });

            // Quarantine all in parallel with a single manifest write
            var (succeeded, failedIds) = QuarantineManager.QuarantineBatch(toClean);
            var failed = failedIds.Select(id => new { id, reason = "Could not quarantine (file in use or already removed)" });
            var failedList = failed.Concat(notFound).ToList();

            return Ok(new
            {
                cleaned = succeeded.Select(e => new { quarantineId = e.Id, fileName = e.FileName }),
                failed = failedList,
                cleanedCount = succeeded.Count,
                failedCount = failedList.Count
            });
        }
    }
}
