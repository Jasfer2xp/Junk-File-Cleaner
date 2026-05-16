import React, { useEffect, useState, useMemo } from "react";
import {
  getQuarantine, restoreFile, deleteFile, purgeAllQuarantine,
  formatBytes, getCategoryBadgeClass, getCategoryLabel
} from "../api/scannerApi";

const PAGE_SIZE = 100;

export default function Quarantine() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [serverPage, setServerPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => { fetchQuarantine(serverPage); }, [serverPage]);

  const fetchQuarantine = async (pg = 0) => {
    try {
      setLoading(true);
      setError(null);
      setSearch("");
      const d = await getQuarantine(pg, PAGE_SIZE);
      setData(d);
    } catch {
      setError("Could not load quarantine. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (msg, isError = false) => {
    setStatusMsg({ msg, isError });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleRestore = async (id) => {
    setActionId(id);
    try {
      await restoreFile(id);
      showStatus("File restored to original location.");
      await fetchQuarantine(serverPage);
    } catch {
      showStatus("Could not restore file — destination may already exist.", true);
    } finally { setActionId(null); }
  };

  const handleDelete = async (id) => {
    setActionId(id);
    setConfirmDeleteId(null);
    try {
      await deleteFile(id);
      showStatus("File permanently deleted.");
      await fetchQuarantine(serverPage);
    } catch {
      showStatus("Could not delete file.", true);
    } finally { setActionId(null); }
  };

  const handlePurgeAll = async () => {
    setConfirmPurge(false);
    try {
      const result = await purgeAllQuarantine();
      showStatus(`Purged ${result?.count ?? "all"} files from quarantine.`);
      setServerPage(0);
      await fetchQuarantine(0);
    } catch {
      showStatus("Failed to purge quarantine.", true);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
  const daysAgo = (d) => {
    const days = Math.floor((Date.now() - new Date(d)) / 86400000);
    return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days}d ago`;
  };

  // Client-side search filter within current server page
  const filtered = useMemo(() => {
    if (!data?.entries) return [];
    if (!search.trim()) return data.entries;
    const q = search.toLowerCase();
    return data.entries.filter(e =>
      e.fileName.toLowerCase().includes(q) ||
      e.originalPath.toLowerCase().includes(q)
    );
  }, [data, search]);

  const totalServerPages = data?.totalPages ?? 1;

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white">Quarantine</h2>
          <p className="text-gray-400 mt-1">Files moved here can be restored or permanently deleted.</p>
        </div>
        <div className="flex gap-3">
          <button id="btn-refresh-quarantine" onClick={fetchQuarantine} className="btn-ghost" disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
          {data?.count > 0 && (confirmPurge ? (
            <div className="flex gap-2 items-center">
              <span className="text-warning text-sm">Delete all {data.count} files?</span>
              <button id="btn-confirm-purge" onClick={handlePurgeAll} className="btn-danger text-sm">Yes, Delete All</button>
              <button onClick={() => setConfirmPurge(false)} className="btn-ghost text-sm">Cancel</button>
            </div>
          ) : (
            <button id="btn-purge-all" onClick={() => setConfirmPurge(true)} className="btn-danger">
              🗑 Purge All ({data.count})
            </button>
          ))}
        </div>
      </div>

      {/* Status toast */}
      {statusMsg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${statusMsg.isError
          ? "bg-danger/10 border border-danger/30 text-danger"
          : "bg-success/10 border border-success/30 text-success"}`}>
          {statusMsg.msg}
        </div>
      )}

      {/* 30-day notice */}
      <div className="mb-6 p-3 bg-success/10 border border-success/30 rounded-xl text-sm text-gray-300 flex gap-3">
        <span className="text-success">🛡️</span>
        <span>Files are kept for <strong className="text-white">30 days</strong> then auto-deleted. Restore any time.</span>
      </div>

      {/* Stats */}
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

      {/* Content */}
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
        <>
          {/* Search + pagination info */}
          <div className="flex items-center gap-4 mb-4">
            <input
              type="text"
              className="input-field flex-1"
              placeholder={`Search in this page (${data.entries.length} of ${data.count} files)…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="text-gray-500 text-sm shrink-0">
              {filtered.length} shown
              {totalServerPages > 1 && ` • Server page ${serverPage + 1}/${totalServerPages}`}
            </span>
          </div>

          {/* File list */}
          <div className="space-y-3">
            {filtered.map((entry) => (
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

                {/* Inline confirm delete instead of window.confirm */}
                {confirmDeleteId === entry.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-warning text-xs">Permanently delete?</span>
                    <button onClick={() => handleDelete(entry.id)} disabled={!!actionId}
                      className="btn-danger text-xs py-1.5 px-3">Yes</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="btn-ghost text-xs py-1.5 px-3">No</button>
                  </div>
                ) : (
                  <div className="flex gap-2 shrink-0">
                    <button id={`btn-restore-${entry.id}`} onClick={() => handleRestore(entry.id)}
                      disabled={actionId === entry.id}
                      className="btn-success text-xs py-1.5 px-3">
                      {actionId === entry.id ? "…" : "↩ Restore"}
                    </button>
                    <button id={`btn-delete-${entry.id}`}
                      onClick={() => setConfirmDeleteId(entry.id)}
                      disabled={actionId === entry.id}
                      className="btn-danger text-xs py-1.5 px-3">
                      🗑 Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Server-side pagination controls */}
          {totalServerPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button onClick={() => setServerPage(0)} disabled={serverPage === 0 || loading}
                className="btn-ghost text-xs py-1.5 px-3">⟨⟨ First</button>
              <button onClick={() => setServerPage(p => p - 1)} disabled={serverPage === 0 || loading}
                className="btn-ghost text-xs py-1.5 px-3">⟨ Prev</button>
              <span className="text-gray-400 text-sm">
                Page {serverPage + 1} of {totalServerPages}
                <span className="text-gray-600 ml-2">({data.count} total files)</span>
              </span>
              <button onClick={() => setServerPage(p => p + 1)} disabled={serverPage >= totalServerPages - 1 || loading}
                className="btn-ghost text-xs py-1.5 px-3">Next ⟩</button>
              <button onClick={() => setServerPage(totalServerPages - 1)} disabled={serverPage >= totalServerPages - 1 || loading}
                className="btn-ghost text-xs py-1.5 px-3">Last ⟩⟩</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
