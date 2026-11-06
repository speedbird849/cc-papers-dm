# Chrome Web Store Submission Guide — PaperShade

## Metadata
- **Extension Name**: PaperShade - CodeChef VIT Papers Dark Mode
- **Short Name**: PaperShade
- **Version**: 1.4.0
- **Summary**: Invert question papers into radiant clear black and white with zero edge glow, plus an individual Original toggle on each page.
- **Category**: Productivity / Accessibility
- **Primary Language**: English

## Store Description
Staring at bright white exam papers late at night while preparing for CAT1, CAT2, and FAT exams? PaperShade transforms previous year question papers on CodeChef-VIT Papers into an eye-friendly, high-contrast dark mode with radiant white text and pitch-black backgrounds.

### Key Features
- **Individual Page Original / Invert Toggles**: Dedicated floating buttons on each page to switch individual pages between dark mode and original scan without affecting the rest of the paper.
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
