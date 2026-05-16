# Junk File Cleaner

A Windows desktop app for finding junk files, reviewing results, and safely moving selected files into quarantine before permanent deletion.

## Features

- Scans temporary files, browser/app cache, old logs, duplicate files, and optional unused files.
- Shows grouped scan results with selectable files.
- Moves cleaned files to `%APPDATA%\JunkCleaner\Quarantine`.
- Supports restore, single delete, and purge-all quarantine actions.
- Ships as an Electron desktop app with a self-contained ASP.NET Core backend.

## Requirements for Development

| Tool | Version |
| ---- | ------- |
| Node.js | 18+ |
| npm | 9+ |
| .NET SDK | 10+ |
| Windows | 10/11 |

## Development

```bat
start-dev.bat
```

This starts the React dev server, Electron shell, and local backend together.

Manual startup:

```bat
cd frontend
npm install
npm run electron:dev
```

## Build the Installer

```bat
build-installer.bat
```

The script:

1. Publishes the backend as a self-contained `win-x64` executable.
2. Builds the React frontend.
3. Packages the Windows NSIS installer.

Output:

```text
frontend\dist\Junk File Cleaner Setup 1.0.0.exe
```

Upload that `.exe` as a GitHub Release asset for users to download. Keep generated folders such as `frontend/dist`, `frontend/backend`, `frontend/build`, and `backend/**/bin|obj` out of source commits.

## Architecture

```text
frontend/
  electron/          Electron main/preload process
  src/               React UI
  public/            App icons and static assets

backend/
  JunkCleaner.API/   Local ASP.NET Core REST API
  JunkCleaner.Core/  Scanner, detector, quarantine logic
```

The Electron process starts the backend and passes a per-launch API token to the frontend through a preload bridge. The frontend sends that token as `X-JunkCleaner-Token` on API requests.

## Important Notes

- The app is unsigned by default. Windows SmartScreen may warn users until you sign releases with a code-signing certificate.
- The backend listens on `http://localhost:5000`.
- Quarantined files are kept under the current user's AppData folder.
