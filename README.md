# PaperShade 🌙
> **CodeChef VIT Papers Dark Mode Extension**

A sleek, lightweight Chrome Extension (Manifest V3) designed for VIT Vellore students studying on [papers.codechefvit.com](https://papers.codechefvit.com). It effortlessly inverts bright white previous year question papers (PDFs) into an eye-friendly dark mode.

---

## ✨ Features

- **🌙 Smart Dark Inversion**: Inverts bright paper backgrounds to midnight black while preserving the original color of diagrams and charts with intelligent hue rotation (`hue-rotate(180deg)`).
- **⚡ Multiple Presets**:
  - **Smart Dark**: Inverted dark background with preserved color hues.
  - **Pure Invert**: Classic 100% negative inversion.
  - **Warm Dark / Sepia**: Calming amber warmth to eliminate blue-light strain during late night exam cramming.
- **🎛️ Fine Adjustments**: Contrast and brightness sliders with instant live updates and one-click reset.
- **🔘 On-Page Quick Toggle**: Sleek floating glassmorphism button on paper pages for fast 1-click switching.
- **⌨️ Keyboard Shortcut**: Press <kbd>Alt</kbd> + <kbd>I</kbd> to toggle color inversion instantly with a subtle HUD toast notification.
- **🖨️ Smart Print Safe**: Automatically turns off inversion when printing so you never waste toner or ink.
- **⚡ Instant Zero-Flicker**: Runs at `document_start` to eliminate blinding white flashbangs when navigating between questions.

---

## 🚀 Installation (Load Unpacked)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/Speedbird849/cc-papers-dm.git
   ```
2. Open Google Chrome and navigate to:
   ```
   chrome://extensions/
   ```
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click **Load unpacked** in the top-left toolbar.
5. Select the `cc-papers-dm` directory.
6. Visit any paper on [papers.codechefvit.com](https://papers.codechefvit.com/paper/697a0dfcaa98890228157993) to experience instant dark mode!

---

## 🛠️ Architecture

- **Manifest V3**: Built following modern Chrome Web Extensions standards.
- **High-Specificity CSS Cascade**: Bypasses the website's built-in `[data-pdf-viewer-theme="light"] { filter: none !important; }` restriction cleanly.
- **Dynamic Mutation Observer**: Continuously monitors the DOM for paginated blob images during scrolling.
- **Background Service Worker**: Handles global keyboard commands (`Alt+I`) and extension badge state.
- **Local Storage API**: Persists reading preferences across sessions without external dependencies.

---

## 📄 License

MIT License. Crafted for VITians preparing for CAT1, CAT2, and FAT exams.
