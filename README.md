# Junk File Cleaner

**Junk File Cleaner** is a Windows desktop app that scans your PC for junk files, shows you exactly what it found, and moves selected files into quarantine before anything is permanently deleted.

It is built for safe cleanup: review first, quarantine first, restore anytime while the file is still in quarantine.

## Download

Download the latest Windows installer from the **Releases** page:

```text
Junk File Cleaner Installer 1.0.1.exe
```

If you are building locally, the installer is created here:

```text
frontend\dist\Junk File Cleaner Installer 1.0.1.exe
```

Current local build SHA256:

```text
1F1D083555A75A1E6E5765F2743AAED1BB4E8ABA5DF80EA2A6EF22EE95CBECC4
```

## Install

1. Download `Junk File Cleaner Installer 1.0.1.exe`.
2. Double-click the installer.
3. Follow the setup wizard.
4. Launch **Junk File Cleaner** from the Desktop shortcut or Start Menu.

The installer is a normal Windows application installer. It installs per-user, creates shortcuts, and can launch the app when setup finishes.

> Note: The installer is currently unsigned. Windows SmartScreen may show a warning until releases are signed with a code-signing certificate.

## What It Does

- Scans common junk locations such as temp folders and browser/app cache.
- Detects temporary files, cache files, old logs, duplicates, and optional unused files.
- Groups results by category so you can review before cleaning.
- Lets you choose exactly which files to clean.
- Moves cleaned files into quarantine instead of deleting them immediately.
- Lets you restore quarantined files back to their original location.
- Lets you permanently delete individual quarantined files or purge all quarantine contents.

## Safety Model

Junk File Cleaner is designed to avoid destructive cleanup surprises.

- Files are **not permanently deleted during cleaning**.
- Cleaned files are moved to:

```text
%APPDATA%\JunkCleaner\Quarantine
```

- Quarantined files can be restored from inside the app.
- Protected system folders are skipped, including:

```text
C:\Windows\System32
C:\Program Files
C:\Program Files (x86)
```

- The desktop app starts a local backend and protects API calls with a per-launch token.
- The backend only listens locally on:

```text
http://localhost:5000
```

## Scan Categories

| Category | Examples |
| --- | --- |
| Temp Files | `.tmp`, `.temp`, `.bak`, Windows temp folders |
| Cache | Browser cache, app cache, cache database sidecars |
| Old Logs | `.log` and `.trace` files older than 30 days |
| Duplicates | Files with matching size and hash fingerprint |
| Unused Files | Optional scan for files not modified in the selected month threshold |

## Screenshots

Main app preview:

![Junk File Cleaner](Junk%20File%20Cleaner.png)

## Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop shell | Electron |
| Frontend | React + Tailwind CSS |
| Backend | ASP.NET Core |
| Core logic | C# |
| Installer | Electron Builder + NSIS |

## Project Structure

```text
Junk-File-Cleaner/
  backend/
    JunkCleaner.API/       Local REST API
    JunkCleaner.Core/      Scanner, detector, quarantine logic

  frontend/
    electron/              Electron main and preload scripts
    public/                App icon and static assets
    src/                   React UI and API client

  build-installer.bat      Builds the release installer
  start-dev.bat            Starts the development app
```

## Development Setup

Requirements:

| Tool | Version |
| --- | --- |
| Windows | 10/11 |
| Node.js | 18+ |
| npm | 9+ |
| .NET SDK | 10+ |

Install dependencies:

```bat
cd frontend
npm install
```

Run the development app:

```bat
start-dev.bat
```

This starts the React dev server, Electron desktop window, and local backend together.

## Build the Installer

Run:

```bat
build-installer.bat
```

The build script:

1. Publishes the backend as a self-contained Windows executable.
2. Builds the React frontend.
3. Packages the app into an NSIS installer.

Release output:

```text
frontend\dist\Junk File Cleaner Installer 1.0.1.exe
```

Upload that `.exe` to GitHub Releases. Do not commit generated folders such as `frontend/dist`, `frontend/backend`, `frontend/build`, or `.NET bin/obj` folders.

## GitHub Release Checklist

1. Commit the source code changes.
2. Run `build-installer.bat`.
3. Go to your GitHub repository.
4. Open **Releases**.
5. Create a new release, for example `v1.0.1`.
6. Upload:

```text
frontend\dist\Junk File Cleaner Installer 1.0.1.exe
```

7. Include the SHA256 hash in the release notes.

## License

MIT License.
