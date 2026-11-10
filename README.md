# PaperShade
> **CodeChef VIT Papers Dark Mode Extension — Clear Black & White Engine**

A sleek, lightweight Chrome Extension (Manifest V3) designed for VIT Vellore students studying on [papers.codechefvit.com](https://papers.codechefvit.com). It effortlessly converts question papers (PDF scans) into an eye-friendly, pure black and white dark mode without edge glow, yellow paper tint, or murky gray backgrounds.

---

## Features

- **Per-Page Original / Invert Toggle**: Every page features an individual floating toggle button (`Original` <-> `Invert`) in the top-right corner. If a particular page has faint pencil or low contrast, toggle that single page back to original scan with 1 click while the rest of the document stays in dark mode!
- **Clear Black & White Engine**: Completely eliminates yellowing, warm lamp lighting, scanner edge glows, and chromatic shadows using full saturation neutralization (`grayscale(1)`).
- **Radiant, Punchy White Text**: Multi-stage luminance boosting makes text strokes pop with pure, bright, high-contrast white so questions and formulas are instantly readable.
- **Pitch Black Backgrounds & High-Fidelity Stroke Retention**: Post-inversion contrast normalization crushes paper backgrounds and photocopy shadows to true `rgb(0, 0, 0)` black while preserving thin table gridlines, Gantt charts, and faint anti-aliased font strokes without clipping.
- **Zero Edge Glow or Outlines**: Strips all borders, box-shadow halos, and website purple column gradients, allowing the paper to blend seamlessly into pure darkness.
- **Multiple Presets**:
  - **Clear B&W (Recommended)**: 100% monochrome, zero glow, radiant white text on pitch black.
  - **Color Restore**: Preserves colors for papers with colorful diagrams and charts.
  - **Warm Dark (Sepia)**: Soft amber warmth for late-night exam prep.
- **Fine Adjustments**:
  - **Text Brightness (80%–180%)**: Fine-tune text brilliance.
  - **Black Depth (60%–160%)**: Easily wipe out severe scanner shadows or dark photocopy borders.
  - **Text Contrast (80%–150%)**: Sharpen text strokes and formula details.
- **On-Page Quick Toggle**: Sleek floating button on paper pages for fast 1-click switching.
- **Keyboard Shortcut**: Press <kbd>Alt</kbd> + <kbd>I</kbd> to toggle color inversion instantly with a subtle HUD toast notification.
- **Smart Print Safe**: Automatically turns off inversion when printing so you never waste toner or ink.
- **Instant Zero-Flicker**: Runs at `document_start` to eliminate blinding white flashbangs when navigating between questions.

---

## Installation (Load Unpacked)

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

## Architecture & Technical Details

- **Manifest V3**: Built following modern Chrome Web Extensions standards.
- **Yellow Paper & Glow Suppression**: Many exam papers are scanned from aged yellow paper or under warm lighting. Under standard hue-rotation, the missing blue channel inverted into bright yellow/brown edge halos. PaperShade uses `grayscale(1)` in Clear B&W mode to strip chromatic imbalance and eliminate glow.
- **High-Specificity CSS Cascade**: Bypasses the website's built-in `[data-pdf-viewer-theme="light"] { filter: none !important; }` restriction cleanly.
- **Dynamic Mutation Observer**: Continuously monitors the DOM for paginated blob images during scrolling.
- **Background Service Worker**: Handles global keyboard commands (`Alt+I`) and extension badge state.
- **Local Storage API**: Persists reading preferences across sessions without external dependencies.

---

## License

MIT License. Crafted for VITians preparing for CAT1, CAT2, and FAT exams.
