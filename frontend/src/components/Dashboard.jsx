import React, { useEffect, useState, useContext } from "react";
import { getSystemInfo, startScan, formatBytes } from "../api/scannerApi";
import { AppContext } from "../App";

function StatCard({ icon, label, value, sub, color = "accent" }) {
  const colorMap = {
    accent: "from-accent/20 to-accent/5 border-accent/30 text-accent-light",
    success: "from-success/20 to-success/5 border-success/30 text-success",
    warning: "from-warning/20 to-warning/5 border-warning/30 text-warning",
    danger: "from-danger/20 to-danger/5 border-danger/30 text-danger",
  };
  return (
    <div className={`stat-card bg-gradient-to-br ${colorMap[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-3xl">{icon}</span>
        <span className={`text-2xl font-bold ${colorMap[color].split(" ").pop()}`}>{value}</span>
      </div>
      <p className="text-gray-300 font-semibold text-sm">{label}</p>
      {sub && <p className="text-gray-500 text-xs">{sub}</p>}
    </div>
  );
}

export default function Dashboard({ onScanStarted }) {
  const { settings } = useContext(AppContext);
  const [sysInfo, setSysInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSysInfo();
  }, []);

  const fetchSysInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const info = await getSystemInfo();
      setSysInfo(info);
    } catch {
      setError("Cannot connect to backend. Make sure the backend is running on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartScan = async () => {
    try {
      setScanning(true);
      setError(null); // clear any previous error before retrying
      const { scanId } = await startScan({
        scanTempFiles: settings.scanTempFiles,
        scanCacheFiles: settings.scanCacheFiles,
        scanOldLogs: settings.scanOldLogs,
        scanDuplicates: settings.scanDuplicates,
        scanUnusedFiles: settings.scanUnusedFiles,
        unusedFileMonths: settings.unusedFileMonths,
        excludedPaths: settings.excludedPaths,
      });
      onScanStarted(scanId);
    } catch {
      setError("Failed to start scan. Is the backend running on port 5000?");
      setScanning(false);
    }
  };

  const usedPct = sysInfo ? Math.round((sysInfo.usedDiskBytes / sysInfo.totalDiskBytes) * 100) : 0;

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white">
          Welcome back 👋
        </h2>
        <p className="text-gray-400 mt-1">Scan your PC for junk files and free up valuable disk space.</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-xl text-danger text-sm flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={fetchSysInfo} className="ml-auto text-xs underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* Hero scan card */}
      <div className="card mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-blue-600/5 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row items-center gap-8">
          {/* Scan icon */}
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-accent/30 to-blue-600/20 border-2 border-accent/40 flex items-center justify-center glow">
              <svg className="w-16 h-16 text-accent-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Text + button */}
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-bold text-white mb-2">Ready to clean your PC?</h3>
            <p className="text-gray-400 mb-6 max-w-md">
              One click scans your entire system for temp files, cache, old logs, and duplicate files.
              Everything goes to quarantine first — nothing is permanently deleted.
            </p>
            <button
              id="btn-start-scan"
              onClick={handleStartScan}
              disabled={scanning}
              className="btn-primary text-lg px-8 py-4 glow"
            >
              {scanning ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Starting scan...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Start Scan
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Disk usage */}
      {loading ? (
        <div className="card mb-8 flex items-center justify-center py-8">
          <svg className="w-8 h-8 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : sysInfo && (
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-accent-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Disk Usage — {sysInfo.driveName}
            </h3>
            <span className="text-sm text-gray-400">{sysInfo.freePercent}% free</span>
          </div>
          <div className="progress-bar h-4 mb-3">
            <div
              className={`progress-fill ${usedPct > 90 ? "from-danger to-danger/70" : usedPct > 70 ? "from-warning to-warning/70" : ""}`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Used: <span className="text-white font-semibold">{formatBytes(sysInfo.usedDiskBytes)}</span></span>
            <span>Free: <span className="text-success font-semibold">{formatBytes(sysInfo.freeDiskBytes)}</span></span>
            <span>Total: <span className="text-white font-semibold">{formatBytes(sysInfo.totalDiskBytes)}</span></span>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="🗑️" label="Temp Files" value="Scanned" sub="*.tmp, *.temp, *.bak" color="warning" />
        <StatCard icon="💾" label="Cache Files" value="Scanned" sub="Browser & app cache" color="accent" />
        <StatCard icon="📋" label="Old Logs" value="Scanned" sub="Logs older than 30 days" color="success" />
        <StatCard icon="🔁" label="Duplicates" value="Scanned" sub="MD5 hash comparison" color="danger" />
      </div>

      {/* What's safe notice */}
      <div className="mt-6 p-4 bg-dark-card border border-dark-border rounded-xl flex gap-3 text-sm text-gray-400">
        <svg className="w-5 h-5 text-success shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>
          <strong className="text-white">100% Safe:</strong> Files are never permanently deleted — they go to quarantine first.
          System paths like <code className="text-accent-light bg-dark-border px-1 rounded">C:\Windows\System32</code> and Program Files are always skipped.
        </span>
      </div>
    </div>
  );
}
