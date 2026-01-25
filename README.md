# Metatron

A lightweight file explorer and hierarchy viewer built with Tauri. 

## Screenshots

### File Listing
![File Listing](Metatron_UI_FileListing.png?v=2)

### Hierarchy View
![Hierarchy View](Metatron_UI_Hierarchy.png?v=2)

## Features

- **File Listing** - Recursively list all files in a directory, filtered by extension
- **Hierarchy View** - Visualize folder structure as a clean tree view
- **Multiple Extension Filtering** - Filter by multiple file types at once
- **Filter by Type Toggle** - Switch between file filtering or folders-only listing
- **Ignored File Types** - Exclude unwanted extensions from results
- **Ignored Folders** - Pick one or more folders to skip during scans
- **Console Output** - View results in a built-in console
- **Copy & Save** - Copy to clipboard or export console output to `.txt` files
- **Config Persistence** - Remembers your output directory between sessions
- **Dark Theme** - Grayscale aesthetic with particle and star effects

## Extension Filter Examples

| Input | Description |
|-------|-------------|
| `.txt` | Single extension |
| `.cpp .h` | Multiple (space-separated) |
| `.txt, .md, .json` | Multiple (comma-separated) |
| `.cpp, .h .hpp` | Mixed separators |
| *(empty)* | All files |

## Ignore Filters

- **Ignored File Types**: Add extensions like `.log .tmp` to skip them.
- **Ignored Folders**: Use the picker to select one or more folders; all selected folders (and their contents) are excluded.

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Rust
- **Framework**: Tauri v2

## Building

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/)

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

The installer will be created at:
```
src-tauri/target/release/bundle/nsis/Metatron_x.x.x_x64-setup.exe
```

## Size

One of the main advantages of using Tauri over Electron:

| | Installer | Executable |
|---|-----------|------------|
| **Metatron (Tauri)** | ~1.8 MB | ~4.9 MB |

## Windows SmartScreen

Windows may show a "Windows protected your PC" warning when running the installer. This happens because the app isn't code-signed with a certificate. To proceed:

1. Click **More info**
2. Click **Run anyway**

This is normal for open-source applications without paid code signing certificates.

## License

MIT
