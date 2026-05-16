import React, { useEffect, useState } from "react";
import { getQuarantine, restoreFile, deleteFile, purgeAllQuarantine, formatBytes, getCategoryBadgeClass, getCategoryLabel } from "../api/scannerApi";

export default function Quarantine() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [confirmPurge, setConfirmPurge] = useState(false);

  useEffect(() => { fetchQuarantine(); }, []);

  const fetchQuarantine = async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await getQuarantine();
      setData(d);
    } catch {
      setError("Could not load quarantine. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id) => {
    setActionId(id);
    try {
      await restoreFile(id);
      await fetchQuarantine();
    } catch {
      alert("Could not restore file.");
    } finally { setActionId(null); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this file? This cannot be undone.")) return;
    setActionId(id);
    try {
      await deleteFile(id);
      await fetchQuarantine();
    } catch {
      alert("Could not delete file.");
    } finally { setActionId(null); }
  };

  const handlePurgeAll = async () => {
    try {
      await purgeAllQuarantine();
      setConfirmPurge(false);
      await fetchQuarantine();
    } catch { alert("Failed to purge quarantine."); }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
  const daysAgo = (d) => {
    const days = Math.floor((Date.now() - new Date(d)) / 86400000);
    return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white">Quarantine</h2>
          <p className="text-gray-400 mt-1">Files moved here can be restored or permanently deleted.</p>
        </div>
        <div className="flex gap-3">
          <button id="btn-refresh-quarantine" onClick={fetchQuarantine} className="btn-ghost">Refresh</button>
          {data?.count > 0 && (confirmPurge ? (
            <div className="flex gap-2">
              <button id="btn-confirm-purge" onClick={handlePurgeAll} className="btn-danger text-sm">Yes, Delete All</button>
              <button onClick={() => setConfirmPurge(false)} className="btn-ghost text-sm">Cancel</button>
            </div>
          ) : (
            <button id="btn-purge-all" onClick={() => setConfirmPurge(true)} className="btn-danger">Purge All</button>
          ))}
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card text-center">
            <p className="text-3xl font-bold text-accent-light">{data.count}</p>
            <p className="text-gray-400 text-sm mt-1">Quarantined Files</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-warning">{formatBytes(data.totalSizeBytes)}</p>
            <p className="text-gray-400 text-sm mt-1">Space Used</p>
          </div>
        </div>
      )}

      <div className="mb-6 p-3 bg-success/10 border border-success/30 rounded-xl text-sm text-gray-300 flex gap-3">
        <span className="text-success">🛡️</span>
        <span>Files are kept for <strong className="text-white">30 days</strong> then auto-deleted. Restore any time.</span>
      </div>

      {loading ? (
        <div className="card flex justify-center py-16">
          <svg className="w-10 h-10 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : error ? (
        <div className="card text-center py-12">
          <p className="text-danger mb-4">{error}</p>
          <button onClick={fetchQuarantine} className="btn-primary mx-auto">Retry</button>
        </div>
      ) : data?.count === 0 ? (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">🛡️</div>
          <h3 className="text-xl font-bold text-white mb-2">Quarantine is empty</h3>
          <p className="text-gray-400">Files you clean will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.entries.map((entry) => (
            <div key={entry.id} className="card flex items-center gap-4 hover:border-accent/40 transition-all p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-semibold text-sm truncate">{entry.fileName}</p>
                  <span className={getCategoryBadgeClass(entry.category)}>{getCategoryLabel(entry.category)}</span>
                </div>
                <p className="text-gray-500 text-xs font-mono truncate mb-1">Original: {entry.originalPath}</p>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>📅 {formatDate(entry.quarantinedAt)} ({daysAgo(entry.quarantinedAt)})</span>
                  <span>📦 {formatBytes(entry.sizeBytes)}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button id={`btn-restore-${entry.id}`} onClick={() => handleRestore(entry.id)}
                  disabled={actionId === entry.id} className="btn-success text-xs py-1.5 px-3">
                  ↩ Restore
                </button>
                <button id={`btn-delete-${entry.id}`} onClick={() => handleDelete(entry.id)}
                  disabled={actionId === entry.id} className="btn-danger text-xs py-1.5 px-3">
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
