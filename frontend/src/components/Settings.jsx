import React, { useContext, useState } from "react";
import { AppContext } from "../App";

function Toggle({ id, checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-dark-border last:border-0">
      <div>
        <p className="text-white font-medium text-sm">{label}</p>
        {description && <p className="text-gray-500 text-xs mt-0.5">{description}</p>}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`toggle ${checked ? "bg-accent" : "bg-dark-border"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

const SETTINGS_KEY = "junkCleaner_settings";

export const loadSavedSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const saveSettingsToStorage = (settings) => {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
};

export default function Settings() {
  const { settings, setSettings } = useContext(AppContext);
  const [newExclude, setNewExclude] = useState("");
  const [saved, setSaved] = useState(false);

  const update = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

  const addExcludedPath = () => {
    const trimmed = newExclude.trim();
    if (!trimmed) return;
    if (!settings.excludedPaths.includes(trimmed)) {
      update("excludedPaths", [...settings.excludedPaths, trimmed]);
    }
    setNewExclude("");
  };

  const removeExcludedPath = (path) => {
    update("excludedPaths", settings.excludedPaths.filter((p) => p !== path));
  };

  const handleSave = () => {
    saveSettingsToStorage(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8 animate-fade-in max-w-2xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white">Settings</h2>
        <p className="text-gray-400 mt-1">Customize which files get scanned and how the app behaves.</p>
      </div>

      {/* Scan Types */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="text-accent-light">🔍</span> Scan Categories
        </h3>
        <Toggle id="toggle-temp" checked={settings.scanTempFiles} onChange={(v) => update("scanTempFiles", v)}
          label="Temp Files" description="*.tmp, *.temp, *.bak — Windows Temp folder" />
        <Toggle id="toggle-cache" checked={settings.scanCacheFiles} onChange={(v) => update("scanCacheFiles", v)}
          label="Cache Files" description="Browser caches, app cache folders" />
        <Toggle id="toggle-logs" checked={settings.scanOldLogs} onChange={(v) => update("scanOldLogs", v)}
          label="Old Logs" description="*.log files older than 30 days" />
        <Toggle id="toggle-duplicates" checked={settings.scanDuplicates} onChange={(v) => update("scanDuplicates", v)}
          label="Duplicate Files" description="Files with identical MD5 hashes" />
        <Toggle id="toggle-unused" checked={settings.scanUnusedFiles} onChange={(v) => update("scanUnusedFiles", v)}
          label="Unused Files" description={`Files not modified in ${settings.unusedFileMonths}+ months (slow)`} />
      </div>

      {/* Unused file threshold */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>⏱️</span> Unused File Threshold
        </h3>
        <div className="flex items-center gap-4">
          <input
            id="input-unused-months"
            type="range" min={1} max={24} value={settings.unusedFileMonths}
            onChange={(e) => update("unusedFileMonths", Number(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="text-white font-bold w-24 text-center bg-dark-surface rounded-lg py-2">
            {settings.unusedFileMonths} month{settings.unusedFileMonths !== 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-gray-500 text-xs mt-2">
          Files not modified in this many months will be flagged as unused (only when "Unused Files" is enabled).
        </p>
      </div>

      {/* Excluded Paths */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>🚫</span> Excluded Folders
        </h3>
        <div className="flex gap-2 mb-4">
          <input
            id="input-exclude-path"
            type="text"
            className="input-field"
            placeholder="e.g. C:\Users\YourName\Documents"
            value={newExclude}
            onChange={(e) => setNewExclude(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addExcludedPath()}
          />
          <button id="btn-add-exclude" onClick={addExcludedPath} className="btn-primary shrink-0">Add</button>
        </div>

        {settings.excludedPaths.length === 0 ? (
          <p className="text-gray-500 text-sm">No excluded folders. Add paths above to skip them during scans.</p>
        ) : (
          <div className="space-y-2">
            {settings.excludedPaths.map((path) => (
              <div key={path} className="flex items-center gap-3 bg-dark-surface rounded-lg px-3 py-2">
                <span className="text-gray-400 text-sm font-mono flex-1 truncate">{path}</span>
                <button onClick={() => removeExcludedPath(path)}
                  className="text-danger hover:text-danger-hover text-xs">Remove</button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 p-3 bg-dark-surface rounded-lg text-xs text-gray-500">
          <strong className="text-gray-400">Always protected (never scanned):</strong>
          <span className="font-mono ml-2 text-accent-light">C:\Windows\System32</span>,{" "}
          <span className="font-mono text-accent-light">C:\Program Files</span>,{" "}
          <span className="font-mono text-accent-light">C:\Program Files (x86)</span>
        </div>
      </div>

      {/* About */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>ℹ️</span> About
        </h3>
        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex justify-between"><span>Version</span><span className="text-white">1.0.0</span></div>
          <div className="flex justify-between"><span>License</span><span className="text-white">MIT</span></div>
          <div className="flex justify-between"><span>Author</span><span className="text-white">Jasfer2xp</span></div>
          <div className="flex justify-between"><span>Backend</span><span className="text-success">ASP.NET Core on :5000</span></div>
          <div className="flex justify-between"><span>Frontend</span><span className="text-accent-light">React + Tailwind</span></div>
        </div>
      </div>

      {/* Save */}
      <button id="btn-save-settings" onClick={handleSave} className="btn-primary">
        {saved ? (
          <>✅ Settings Saved!</>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Save Settings
          </>
        )}
      </button>
    </div>
  );
}
