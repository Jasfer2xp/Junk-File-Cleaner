import React, { useState, useMemo } from "react";
import { cleanFiles, formatBytes, getCategoryBadgeClass, getCategoryLabel } from "../api/scannerApi";

const CATEGORIES = ["TempFile", "Cache", "OldLog", "Duplicate", "UnusedFile"];

const CAT_ICONS = {
  TempFile: "🗑️",
  Cache: "💾",
  OldLog: "📋",
  Duplicate: "🔁",
  UnusedFile: "📦",
};

export default function Results({ scanResults, onNewScan, onGoToQuarantine }) {
  const [selected, setSelected] = useState(() => {
    const s = {};
    (scanResults?.results || []).forEach((f) => (s[f.id] = true));
    return s;
  });
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState(null);
  const [expandedCat, setExpandedCat] = useState({});
  const [confirming, setConfirming] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const results = useMemo(() => scanResults?.results || [], [scanResults]);

  const grouped = useMemo(() => {
    const g = {};
    CATEGORIES.forEach((c) => (g[c] = []));
    results.forEach((f) => {
      if (g[f.category]) g[f.category].push(f);
    });
    return g;
  }, [results]);

  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
  const selectedBytes = results.filter((f) => selected[f.id]).reduce((s, f) => s + f.sizeBytes, 0);
  const totalBytes = results.reduce((s, f) => s + f.sizeBytes, 0);

  const toggleFile = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const toggleAll = () => {
    const allSelected = selectedIds.length === results.length;
    const next = {};
    results.forEach((f) => (next[f.id] = !allSelected));
    setSelected(next);
  };
  const toggleCategory = (cat) => {
    const catFiles = grouped[cat];
    const allSelected = catFiles.every((f) => selected[f.id]);
    const next = { ...selected };
    catFiles.forEach((f) => (next[f.id] = !allSelected));
    setSelected(next);
  };

  const handleClean = async () => {
    if (selectedIds.length === 0) return;
    setCleaning(true);
    setCleanResult(null);
    try {
      const result = await cleanFiles(scanResults.scanId, selectedIds);
      setCleanResult(result);
    } catch {
      setCleanResult({ error: "Failed to clean files. Please try again." });
    } finally {
      setCleaning(false);
      setConfirming(false);
    }
  };

  if (cleanResult && !cleanResult.error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-screen animate-fade-in">
        <div className="w-full max-w-md text-center">
          <div className="w-24 h-24 rounded-full bg-success/20 border-2 border-success/40 flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Cleaning Complete!</h2>
          <p className="text-gray-400 mb-8">
            <strong className="text-success">{cleanResult.cleanedCount}</strong> files moved to quarantine.
            {cleanResult.failedCount > 0 && (
              <span className="text-warning"> {cleanResult.failedCount} files could not be moved (in use or already removed).</span>
            )}
          </p>
          <div className="flex gap-4 justify-center">
            <button id="btn-view-quarantine" onClick={onGoToQuarantine} className="btn-primary">
              View Quarantine
            </button>
            <button id="btn-new-scan" onClick={onNewScan} className="btn-ghost">
              New Scan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white">Scan Results</h2>
          <p className="text-gray-400 mt-1">
            Found <strong className="text-danger">{results.length}</strong> junk files
            totalling <strong className="text-danger">{formatBytes(totalBytes)}</strong>
          </p>
        </div>
        <button id="btn-new-scan-top" onClick={onNewScan} className="btn-ghost">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          New Scan
        </button>
      </div>

      {/* Summary card */}
      <div className="card mb-6 bg-gradient-to-br from-danger/10 to-dark-card">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-danger">{results.length}</p>
            <p className="text-gray-400 text-sm mt-1">Total Junk Files</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-warning">{formatBytes(totalBytes)}</p>
            <p className="text-gray-400 text-sm mt-1">Space to Free</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-accent-light">{selectedIds.length}</p>
            <p className="text-gray-400 text-sm mt-1">Selected ({formatBytes(selectedBytes)})</p>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              id="chk-select-all"
              type="checkbox"
              checked={selectedIds.length === results.length && results.length > 0}
              onChange={toggleAll}
              className="w-4 h-4 rounded accent-accent"
            />
            <span className="text-gray-300 text-sm font-medium">Select All</span>
          </label>
          <span className="text-gray-600 text-sm">({selectedIds.length} of {results.length} selected)</span>
        </div>

        {confirming ? (
          <div className="flex items-center gap-3">
            <span className="text-warning text-sm">Clean {selectedIds.length} files ({formatBytes(selectedBytes)})?</span>
            <button id="btn-confirm-clean" onClick={handleClean} disabled={cleaning} className="btn-danger">
              {cleaning ? "Cleaning…" : "Yes, Clean"}
            </button>
            <button onClick={() => setConfirming(false)} className="btn-ghost">Cancel</button>
          </div>
        ) : (
          <button
            id="btn-clean-selected"
            onClick={() => setConfirming(true)}
            disabled={selectedIds.length === 0 || cleaning}
            className="btn-danger"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clean Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {cleanResult?.error && (
        <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
          {cleanResult.error}
        </div>
      )}

      {/* Grouped results */}
      <div className="space-y-4">
        {CATEGORIES.map((cat) => {
          const files = grouped[cat];
          if (!files.length) return null;
          const catSelected = files.filter((f) => selected[f.id]).length;
          const isExpanded = expandedCat[cat] !== false;
          const catBytes = files.reduce((s, f) => s + f.sizeBytes, 0);

          return (
            <div key={cat} className="card p-0 overflow-hidden">
              {/* Category header */}
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-dark-border/30 transition-colors"
                onClick={() => setExpandedCat((e) => ({ ...e, [cat]: !isExpanded }))}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={catSelected === files.length}
                    onChange={() => toggleCategory(cat)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded accent-accent"
                  />
                  <span className="text-xl">{CAT_ICONS[cat]}</span>
                  <span className="font-semibold text-white">{getCategoryLabel(cat)}s</span>
                  <span className={getCategoryBadgeClass(cat)}>{files.length}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-warning text-sm font-medium">{formatBytes(catBytes)}</span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* File list */}
              {isExpanded && (
                <div className="border-t border-dark-border divide-y divide-dark-border/50 max-h-80 overflow-y-auto">
                  {files.map((file) => (
                    <label key={file.id} className="flex items-center gap-3 px-4 py-3 hover:bg-dark-border/20 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!selected[file.id]}
                        onChange={() => toggleFile(file.id)}
                        className="w-4 h-4 rounded accent-accent shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{file.fileName}</p>
                        <p className="text-gray-500 text-xs truncate font-mono">{file.filePath}</p>
                        {file.reason && <p className="text-gray-600 text-xs">{file.reason}</p>}
                      </div>
                      <span className="text-warning text-sm font-semibold shrink-0 ml-2">
                        {formatBytes(file.sizeBytes)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {results.length === 0 && (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">✨</div>
          <h3 className="text-xl font-bold text-white mb-2">Your PC is clean!</h3>
          <p className="text-gray-400">No junk files were found in the scanned locations.</p>
        </div>
      )}
    </div>
  );
}
