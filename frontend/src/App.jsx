import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ScanProgress from "./components/ScanProgress";
import Results from "./components/Results";
import Quarantine from "./components/Quarantine";
import Settings from "./components/Settings";

export const AppContext = React.createContext();

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [scanId, setScanId] = useState(null);
  const [scanResults, setScanResults] = useState(null);
  const [settings, setSettings] = useState({
    scanTempFiles: true,
    scanCacheFiles: true,
    scanOldLogs: true,
    scanDuplicates: true,
    scanUnusedFiles: false,
    unusedFileMonths: 6,
    excludedPaths: [],
    darkMode: true,
  });

  const handleScanStarted = (id) => {
    setScanId(id);
    setScanResults(null);
    setPage("scanning");
  };

  const handleScanComplete = (results) => {
    setScanResults(results);
    setPage("results");
  };

  const handleNewScan = () => {
    setScanId(null);
    setScanResults(null);
    setPage("dashboard");
  };

  return (
    <AppContext.Provider value={{ settings, setSettings }}>
      <div className="flex h-screen overflow-hidden bg-dark-bg">
        <Sidebar currentPage={page} onNavigate={setPage} />
        <main className="flex-1 overflow-y-auto">
          {page === "dashboard" && (
            <Dashboard onScanStarted={handleScanStarted} />
          )}
          {page === "scanning" && (
            <ScanProgress
              scanId={scanId}
              onComplete={handleScanComplete}
              onCancel={handleNewScan}
            />
          )}
          {page === "results" && (
            <Results
              scanResults={scanResults}
              onNewScan={handleNewScan}
              onGoToQuarantine={() => setPage("quarantine")}
            />
          )}
          {page === "quarantine" && <Quarantine />}
          {page === "settings" && <Settings />}
        </main>
      </div>
    </AppContext.Provider>
  );
}
