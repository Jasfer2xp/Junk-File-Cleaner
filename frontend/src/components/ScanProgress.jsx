import React, { useEffect, useState, useRef } from "react";
import { getScanStatus, getScanResults, cancelScan, formatBytes } from "../api/scannerApi";

export default function ScanProgress({ scanId, onComplete, onCancel }) {
  const [status, setStatus] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const intervalRef = useRef(null);

  const pollCallbackRef = useRef(null);

  useEffect(() => {
    if (!scanId) return;

    pollCallbackRef.current = async () => {
      try {
        const s = await getScanStatus(scanId);
        setStatus(s);
        if (s.status === "Completed" || s.status === "Cancelled" || s.status === "Failed") {
          clearInterval(intervalRef.current);
          if (s.status === "Completed") {
            const results = await getScanResults(scanId);
            onComplete(results);
          } else {
            onCancel();
          }
        }
      } catch {
        // Network error during polling — stop and go back
        clearInterval(intervalRef.current);
        onCancel();
      }
    };

    // Kick off immediately then poll every 800ms
    pollCallbackRef.current();
    intervalRef.current = setInterval(() => pollCallbackRef.current?.(), 800);
    return () => clearInterval(intervalRef.current);
  }, [scanId, onComplete, onCancel]);

  const handleCancel = async () => {
    setCancelling(true);
    clearInterval(intervalRef.current);
    await cancelScan(scanId).catch(() => {});
    onCancel();
  };

  const pct = status?.progressPercent ?? 0;
  const currentFile = status?.currentFile ?? "";
  const shortFile = currentFile.length > 60
    ? "..." + currentFile.slice(-60)
    : currentFile;

  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-screen animate-fade-in">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent/30 to-blue-600/20 border-2 border-accent/50 flex items-center justify-center">
              <svg className="w-12 h-12 text-accent-light animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {/* Orbit ring */}
            <div className="absolute inset-0 rounded-full border-2 border-accent/20 animate-ping" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Scanning Your PC</h2>
          <p className="text-gray-400">Analyzing files for junk — this may take a few minutes.</p>
        </div>

        {/* Progress card */}
        <div className="card mb-6">
          {/* Percent + label */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-semibold text-white">{pct}% complete</span>
            <span className="text-sm text-accent-light font-medium">
              {status?.status === "Running" ? "Scanning…" : status?.status ?? "Starting…"}
            </span>
          </div>

          {/* Progress bar */}
          <div className="progress-bar mb-6 relative">
            <div className="progress-fill glow" style={{ width: `${pct}%` }} />
            {pct < 100 && (
              <div
                className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                style={{ left: `${Math.max(0, pct - 8)}%` }}
              />
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-dark-surface rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-white">{status?.totalFilesScanned?.toLocaleString() ?? 0}</p>
              <p className="text-gray-400 text-sm mt-1">Files scanned</p>
            </div>
            <div className="bg-dark-surface rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-danger">{status?.junkFilesFound?.toLocaleString() ?? 0}</p>
              <p className="text-gray-400 text-sm mt-1">Junk found</p>
            </div>
          </div>

          {/* Space to free */}
          {status?.totalJunkBytes > 0 && (
            <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 mb-6 flex items-center gap-3">
              <svg className="w-5 h-5 text-danger shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-white text-sm">
                <strong className="text-danger">{formatBytes(status.totalJunkBytes)}</strong> of junk found so far
              </span>
            </div>
          )}

          {/* Current file */}
          <div className="bg-dark-surface rounded-lg p-3">
            <p className="text-gray-500 text-xs mb-1">Currently scanning:</p>
            <p className="text-gray-300 text-xs font-mono truncate" title={currentFile}>
              {shortFile || "Initializing…"}
            </p>
          </div>
        </div>

        {/* Cancel button */}
        <div className="flex justify-center">
          <button
            id="btn-cancel-scan"
            onClick={handleCancel}
            disabled={cancelling}
            className="btn-ghost"
          >
            {cancelling ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Cancelling…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel Scan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
