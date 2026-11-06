# Chrome Web Store Submission Guide — PaperShade

## Metadata
- **Extension Name**: PaperShade - CodeChef VIT Papers Dark Mode
- **Short Name**: PaperShade
- **Version**: 1.3.1
- **Summary**: Invert question papers into radiant clear black and white with zero edge glow, plus page-specific auto-bypass for low-contrast scans.
- **Category**: Productivity / Accessibility
- **Primary Language**: English

## Store Description
Staring at bright white exam papers late at night while preparing for CAT1, CAT2, and FAT exams? PaperShade transforms previous year question papers on CodeChef-VIT Papers into an eye-friendly, high-contrast dark mode with radiant white text and pitch-black backgrounds.

### Key Features
- **Page-Specific Auto-Bypass for Low-Contrast Scans**: Evaluates each page independently using high-precision ink stroke and contrast analysis. If page 1 has faint, low-contrast ink, it is automatically kept as the original scan while page 2 and 3 stay in pitch-black dark mode.
- **Interactive Per-Page Badges**: Seamless 1-click toggle buttons directly on each page to switch individual pages between dark and original modes.
- **Clear Black & White Engine**: Strips yellow paper tints, warm lighting, and edge scanner halos into 100% clean black and white.
- **Radiant White Text**: Boosts text strokes so font details and formulas are crisp, brilliant, and easy to read.
- **True Black Pitch Backgrounds**: Inverts paper to pure `#000000` black, blending seamlessly with your dark display.
- **Zero Edge Glow**: Removes all outlines and site gradient bleeds around the paper viewports.
- **Multiple Reading Modes**:
  - *Clear B&W (Recommended)*: Zero glow, radiant white text on pitch black.
  - *Color Restore*: Preserves colors for papers with colorful diagrams and charts.
  - *Warm Dark / Sepia*: Soft sepia warmth for night-time cramming sessions.
- **Fine-Tuning Controls**: Easily dial in Text Brightness, Black Depth (shadow cleaning), and Contrast to match your display.
- **Floating Quick Toggle**: Unobtrusive on-page toggle button right beside the paper viewer for instant 1-click switching.
- **Keyboard Shortcut**: Press `Alt+I` anywhere on a paper page to instantly toggle between dark and original modes.
- **Print Protection**: Automatically disables color inversion when printing or saving PDFs so ink and toner are never wasted.
- **Zero White Flash**: Pre-injected styling ensures papers load dark immediately without blinding white flashes.

## Permissions Justification
- `storage`: Required to save user preferences locally across browser sessions (dark mode state, chosen reading mode, black depth, text brightness, contrast values). No personal data or browsing activity is collected or transmitted.
- Host permissions (`*://papers.codechefvit.com/*`, `*://www.papers.codechefvit.com/*`): Required to inject content scripts and CSS filter overrides that invert the question paper viewports on the CodeChef-VIT Papers portal.

## Privacy & Data Use
PaperShade does not track, collect, store, or transmit any user data, personal information, or browsing history. All preference data resides purely within local device storage via `chrome.storage.local`.
