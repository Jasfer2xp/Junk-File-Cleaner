using JunkCleaner.Core.Quarantine;
using Microsoft.AspNetCore.Mvc;

namespace JunkCleaner.API.Controllers
{
    [ApiController]
    [Route("api/quarantine")]
    public class QuarantineController : ControllerBase
    {
        [HttpGet]
        public IActionResult List()
        {
            QuarantineManager.PurgeOldEntries(30);
            var entries = QuarantineManager.LoadManifest();
            var totalSize = QuarantineManager.GetQuarantineSize();
            return Ok(new { entries, totalSizeBytes = totalSize, count = entries.Count });
        }

        [HttpPost("restore/{id}")]
        public IActionResult Restore(string id)
        {
            var success = QuarantineManager.RestoreFile(id);
            if (!success) return BadRequest(new { error = "Could not restore file. It may have been deleted or the destination already exists." });
            return Ok(new { message = "File restored successfully" });
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(string id)
        {
            var success = QuarantineManager.PermanentlyDelete(id);
            if (!success) return NotFound(new { error = "Quarantine entry not found" });
            return Ok(new { message = "File permanently deleted" });
        }

        [HttpDelete("purge/all")]
        public IActionResult PurgeAll()
        {
            var entries = QuarantineManager.LoadManifest();
            int count = 0;
            foreach (var e in entries)
            {
                if (QuarantineManager.PermanentlyDelete(e.Id)) count++;
            }
            return Ok(new { message = $"Purged {count} files" });
        }
    }
}
