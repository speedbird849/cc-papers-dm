# PaperShade 🌙
> **CodeChef VIT Papers Dark Mode Extension — True Black Engine**

A sleek, lightweight Chrome Extension (Manifest V3) designed for VIT Vellore students studying on [papers.codechefvit.com](https://papers.codechefvit.com). It effortlessly converts question papers (PDF scans) into an eye-friendly, pitch-black dark mode without murky gray backgrounds.

---

## ✨ Features

- **🖤 True Black Recolor Engine**: Unlike naive inverters that turn scanned photocopy gray into washed-out dark gray, PaperShade uses pre-inversion luminance scaling (`brightness(1.6) contrast(1.35) invert(1)`) to ensure the paper background becomes genuine `#000000` pitch black while ink text renders razor-sharp.
- **🎨 Smart Hue Preservation**: Uses `hue-rotate(180deg)` so colorful diagrams, grading stamps, and ink notations retain their intended natural colors rather than flipping across the color wheel.
- **⚡ Multiple Presets**:
  - **True Black (Smart Invert)**: Pitch-black background with preserved diagram colors.
  - **Pure Invert**: Classic 100% negative inversion.
  - **Warm Dark / Sepia**: Calming amber warmth to eliminate blue-light strain during late night exam cramming.
- **🎛️ Fine Adjustments**:
  - **Black Depth (Scan Clean)**: Adjust how aggressively photocopy shadows and camera scan grain are eliminated.
  - **Text Contrast & Text Brightness**: Custom dial for your screen and ambient lighting.
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
6. Visit any paper on [papers.codechefvit.com](https://papers.codechefvit.com/paper/697a0dfcaa98890228157993) to experience instant true-black dark mode!

---

## 🛠️ Architecture & Technical Details

- **Manifest V3**: Built following modern Chrome Web Extensions standards.
- **Photocopy Gray Elimination**: Scanned exam papers typically have backgrounds around 65%–75% luminance (RGB ~170–190). Naive inversion leaves them at ~30% luminance (a visible murky gray). PaperShade's two-stage filter cleanses the scan highlights to 100% white before inversion, resulting in true `rgb(0, 0, 0)` paper sheets.
- **High-Specificity CSS Cascade**: Bypasses the website's built-in `[data-pdf-viewer-theme="light"] { filter: none !important; }` restriction cleanly.
- **Dynamic Mutation Observer**: Continuously monitors the DOM for paginated blob images during scrolling.
- **Background Service Worker**: Handles global keyboard commands (`Alt+I`) and extension badge state.
- **Local Storage API**: Persists reading preferences across sessions without external dependencies.

---

## 📄 License

MIT License. Crafted for VITians preparing for CAT1, CAT2, and FAT exams.
