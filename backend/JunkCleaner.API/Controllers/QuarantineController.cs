using JunkCleaner.Core.Quarantine;
using Microsoft.AspNetCore.Mvc;
using System.Linq;

namespace JunkCleaner.API.Controllers
{
    [ApiController]
    [Route("api/quarantine")]
    public class QuarantineController : ControllerBase
    {
        [HttpGet]
        public IActionResult List([FromQuery] int page = 0, [FromQuery] int pageSize = 100)
        {
            QuarantineManager.PurgeOldEntries(30);
            var all = QuarantineManager.LoadManifest();
            var totalSize = all.Sum(e => e.SizeBytes);
            var paged = all.Skip(page * pageSize).Take(pageSize).ToList();
            return Ok(new
            {
                entries = paged,
                totalSizeBytes = totalSize,
                count = all.Count,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)all.Count / pageSize)
            });
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
            // Guard: don't match "purge" as an id
            if (id.Equals("purge", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { error = "Invalid id" });

            var success = QuarantineManager.PermanentlyDelete(id);
            if (!success) return NotFound(new { error = "Quarantine entry not found" });
            return Ok(new { message = "File permanently deleted" });
        }

        [HttpDelete("purge/all")]
        public IActionResult PurgeAll()
        {
            // Load once, delete all files, save empty manifest in one shot
            var entries = QuarantineManager.LoadManifest();
            int count = QuarantineManager.PurgeAll(entries);
            return Ok(new { message = $"Purged {count} files", count });
        }
    }
}
