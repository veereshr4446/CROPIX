# Cropix

**A fast, browser-based image cropper for sprite sheets and multi-region assets.**

Cropix lets you upload a single image, drag to select any number of regions, and export them all as individual PNGs in one click — no backend, no sign-up, no upload to a server. Everything runs client-side.

[**Live Demo**](https://veereshr4446.github.io/CROPIX/) · [**Report Bug**](https://github.com/veereshr4446/CROPIX/issues) · [**Request Feature**](https://github.com/veereshr4446/CROPIX/issues)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Browser Support](#browser-support)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## Overview

Splitting a sprite sheet into individual frames is a repetitive task. Existing tools are either bloated desktop apps, upload your images to a third-party server, or force you to crop one region at a time.

**Cropix solves this.** It runs entirely in your browser, keeps your images local, and lets you:

1. Drop in a sprite sheet
2. Drag to select each frame
3. Export everything as a clean ZIP of PNGs

It's designed for game developers, animators, designers, and anyone working with sprite-based assets.

---

## Features

### Core
- **Drag-to-select** — Draw any rectangular region directly on the canvas
- **Auto-add on release** — Selections are saved automatically the moment you release the mouse
- **Live preview gallery** — Every captured region appears instantly below the canvas with a numbered badge
- **One-click ZIP export** — All regions exported as `region-01.png`, `region-02.png`, etc.

### Precision Tools
- **Eight resize handles** — Resize any selection from corners or edges
- **Move mode** — Drag inside a selection to reposition it without redrawing
- **Snap to canvas edges** — Selections snap when within 6px of image bounds
- **Arrow-key nudging** — Move selections by 1px (or 10px with Shift)
- **Live size tooltip** — Shows current dimensions in pixels while dragging

### Workspace
- **Zoom & Pan** — Ctrl+Scroll to zoom toward cursor, plain scroll to pan
- **Fit to view / Reset zoom** — One-click framing controls
- **Undo / Redo** — 50-step history covering adds, deletes, moves, and resizes
- **Numbered canvas badges** — Every region is labeled with its index on the canvas itself
- **Preset sizes** — Quick-select 128, 256, 512, 768, 1024, or 2048 pixel crops

### Input
- **Drag & drop** — Drop an image anywhere onto the page
- **Paste from clipboard** — Ctrl+V an image directly
- **File picker** — Standard click-to-browse
- **Full keyboard control** — Every action has a shortcut

### Experience
- **Fully responsive** — Works on mobile, tablet, and desktop
- **Touch support** — Pinch, drag, and resize on touchscreens
- **Dark-mode-ready design system** — Built with CSS custom properties
- **Zero dependencies** — Except JSZip for export (loaded via CDN)
- **100% client-side** — Images never leave your browser

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Markup | HTML5 |
| Styling | Vanilla CSS3 (custom properties, grid, flexbox) |
| Logic | Vanilla JavaScript (ES6+, Canvas API) |
| Fonts | Inter, JetBrains Mono (Google Fonts) |
| Export | JSZip (CDN) |
| Hosting | GitHub Pages |

**No build step. No frameworks. No npm install.** Open `index.html` and it runs.

---

## Getting Started

### Option 1 — Run locally

```bash
git clone https://github.com/veereshr4446/CROPIX.git
cd CROPIX
```

Then open `index.html` in your browser. That's it.

For the best experience (avoids any local file restrictions on paste/drag), use a local server:

```bash
# Python 3
python -m http.server 8000

# Node
npx serve .
```

Then visit `http://localhost:8000`.

### Option 2 — Use the live version

Visit [https://veereshr4446.github.io/CROPIX/](https://veereshr4446.github.io/CROPIX/) and start cropping.

---

## Usage

1. **Upload an image** — Drag & drop, paste with `Ctrl+V`, or click to browse
2. **Select a region** — Click and drag on the canvas
3. **Release the mouse** — The region is saved automatically and appears in the gallery below
4. **Adjust if needed** — Grab a handle to resize, or drag inside to move
5. **Repeat** — Capture as many regions as you need
6. **Export** — Click **Export** to download every region as a ZIP of PNGs

### Tips
- Use **Fit** to frame the image perfectly
- Use **Ctrl+Scroll** to zoom in for pixel-perfect selections
- Turn off **Auto-add on release** if you want to draw and adjust before saving
- Use **Preset sizes** to force a specific crop dimension

---

## Keyboard Shortcuts

| Action | Shortcut |
| --- | --- |
| Undo | `Ctrl+Z` / `Cmd+Z` |
| Redo | `Ctrl+Shift+Z` / `Cmd+Shift+Z` |
| Export ZIP | `Ctrl+E` / `Cmd+E` |
| Delete selected region | `Delete` / `Backspace` |
| Deselect | `Esc` |
| Zoom in | `+` / `=` |
| Zoom out | `-` / `_` |
| Reset zoom to 100% | `Ctrl+0` / `Cmd+0` |
| Nudge selection | `Arrow keys` |
| Nudge selection (10px) | `Shift + Arrow keys` |

---

## Project Structure

```
CROPIX/
├── index.html    # Page structure and layout
├── style.css     # All styling including responsive breakpoints
├── script.js     # Canvas logic, state management, export
└── README.md
```

Three files. No build config, no bundler, no transpiler.

---

## How It Works

Cropix uses the HTML5 Canvas API to render the uploaded image and overlay interactive elements on top of it.

**State management** is handled by a single `state` object containing the loaded image, current selection, captured regions, zoom level, and undo history.

**Selection logic** lives in `startPointer`, `movePointer`, and `endPointer` — a unified pointer handler that works for both mouse and touch. It detects whether you're starting a new selection, moving an existing one, or resizing via a handle, then routes the drag accordingly.

**Undo/Redo** stores JSON snapshots of `poses`, `selection`, and `selectedIndex` in a bounded array (50 steps). Every mutation calls `pushHistory()`, and `Ctrl+Z` simply walks the index back.

**Export** renders each region to an offscreen canvas, converts it to a PNG data URL, and packs them into a ZIP using JSZip.

**No images ever leave the browser.** There is no server, no upload endpoint, no telemetry.

---

## Browser Support

| Browser | Support |
| --- | --- |
| Chrome / Edge | ✅ Full |
| Firefox | ✅ Full |
| Safari | ✅ Full (14+) |
| Mobile Safari (iOS) | ✅ Full |
| Chrome Android | ✅ Full |
| Older browsers | ⚠️ Requires ES6+ and Canvas API |

---

## Roadmap

Planned and considered features for future versions:

- [ ] **Auto-detect sprite grid** — Analyze spacing and slice automatically
- [ ] **Manual grid overlay** — Configurable rows × columns guide
- [ ] **Region renaming** — Custom names for exported files
- [ ] **Export formats** — WebP and JPG with quality slider
- [ ] **Padding control** — Add N pixels of transparent padding to each crop
- [ ] **Batch resize** — Force all regions to a target dimension
- [ ] **Dark mode** — System-aware theme toggle
- [ ] **LocalStorage persistence** — Recover work after refresh
- [ ] **Drag-to-reorder gallery** — Change export order
- [ ] **Region duplication** — Copy a region repeatedly

Have an idea? [Open an issue](https://github.com/veereshr4446/CROPIX/issues).

---

## Contributing

Contributions are welcome. To get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/auto-grid`)
3. Commit your changes (`git commit -m "Add auto-grid detection"`)
4. Push to the branch (`git push origin feature/auto-grid`)
5. Open a Pull Request

Please keep the codebase dependency-free and the CSS design-system-driven. Bug reports and feature suggestions are equally welcome as issues.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## Author

**Viresh R**

- GitHub: [@veereshr4446](https://github.com/veereshr4446)
- Project: [CROPIX](https://github.com/veereshr4446/CROPIX)

---

<p align="center">
  Built with ❤️ by Viresh R
  <br>
  <sub>© 2026 Viresh R. All rights reserved.</sub>
</p>
```

---
