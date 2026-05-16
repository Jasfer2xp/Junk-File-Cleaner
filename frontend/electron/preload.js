const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("junkCleaner", {
  apiToken: process.env.JUNK_CLEANER_API_TOKEN || "",
});
