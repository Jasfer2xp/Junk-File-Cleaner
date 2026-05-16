import axios from "axios";

const BASE_URL = "http://localhost:5000/api";
const API_TOKEN = window.junkCleaner?.apiToken || "";
const authHeaders = API_TOKEN ? { "X-JunkCleaner-Token": API_TOKEN } : {};

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json", ...authHeaders },
});

// Separate instance with a long timeout for clean operations (many files)
const apiLong = axios.create({
  baseURL: BASE_URL,
  timeout: 300000, // 5 minutes
  headers: { "Content-Type": "application/json", ...authHeaders },
});

// ── System ────────────────────────────────────────────────
export const getSystemInfo = async () => {
  const { data } = await api.get("/system/info");
  return data;
};

// ── Scan ──────────────────────────────────────────────────
export const startScan = async (request = {}) => {
  const { data } = await api.post("/scan/start", request);
  return data; // { scanId }
};

export const getScanStatus = async (scanId) => {
  const { data } = await api.get(`/scan/status/${scanId}`);
  return data;
};

export const getScanResults = async (scanId) => {
  const { data } = await api.get(`/results/${scanId}`);
  return data;
};

export const cancelScan = async (scanId) => {
  const { data } = await api.post(`/scan/cancel/${scanId}`);
  return data;
};

// ── Clean ─────────────────────────────────────────────────
export const cleanFiles = async (scanId, fileIds) => {
  const { data } = await apiLong.post("/clean", { scanId, fileIds });
  return data;
};

// ── Quarantine ────────────────────────────────────────────
export const getQuarantine = async (page = 0, pageSize = 100) => {
  const { data } = await api.get(`/quarantine?page=${page}&pageSize=${pageSize}`);
  return data;
};

export const restoreFile = async (id) => {
  const { data } = await api.post(`/quarantine/restore/${id}`);
  return data;
};

export const deleteFile = async (id) => {
  const { data } = await api.delete(`/quarantine/${id}`);
  return data;
};

export const purgeAllQuarantine = async () => {
  const { data } = await api.delete("/quarantine/purge/all");
  return data;
};

// ── Helpers ───────────────────────────────────────────────
export const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const getCategoryBadgeClass = (category) => {
  const map = {
    TempFile: "badge-temp",
    Cache: "badge-cache",
    OldLog: "badge-log",
    Duplicate: "badge-duplicate",
    UnusedFile: "badge-unused",
  };
  return `badge ${map[category] || "badge-unused"}`;
};

export const getCategoryLabel = (category) => {
  const map = {
    TempFile: "Temp File",
    Cache: "Cache",
    OldLog: "Old Log",
    Duplicate: "Duplicate",
    UnusedFile: "Unused",
  };
  return map[category] || category;
};
