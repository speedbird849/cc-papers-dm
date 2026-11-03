# Chrome Web Store Submission Guide — PaperShade

## Metadata
- **Extension Name**: PaperShade - CodeChef VIT Papers Dark Mode
- **Short Name**: PaperShade
- **Version**: 1.0.0
- **Summary**: Invert question papers into eye-friendly dark mode on papers.codechefvit.com with smart contrast and color preservation.
- **Category**: Productivity / Accessibility
- **Primary Language**: English

## Store Description
Staring at bright white exam papers late at night while preparing for CAT1, CAT2, and FAT exams? PaperShade transforms previous year question papers on CodeChef-VIT Papers into an eye-friendly, high-contrast dark mode.

### Key Features
- **Smart Dark Invert**: Inverts white paper backgrounds to deep black while preserving natural diagram colors and annotations using intelligent hue rotation.
- **Multiple Reading Modes**:
  - *Smart Dark*: Balanced dark reading mode with hue-rotated diagram preservation.
  - *Pure Invert*: Direct 1:1 inverted negative color mode.
  - *Warm Dark / Sepia*: Soft sepia warmth for night-time cramming sessions.
- **Fine-Tuning Controls**: Easily dial in contrast and brightness to match your display and ambient lighting.
- **Floating Quick Toggle**: Unobtrusive on-page toggle button right beside the paper viewer for instant 1-click switching.
- **Keyboard Shortcut**: Press `Alt+I` anywhere on a paper page to instantly toggle between dark and original modes.
- **Print Protection**: Automatically disables color inversion when printing or saving PDFs so ink and toner are never wasted.
- **Zero White Flash**: Pre-injected styling ensures papers load dark immediately without blinding white flashes.

## Permissions Justification
- `storage`: Required to save user preferences locally across browser sessions (dark mode state, chosen reading mode, contrast and brightness values). No personal data or browsing activity is collected or transmitted.
- Host permissions (`*://papers.codechefvit.com/*`, `*://www.papers.codechefvit.com/*`): Required to inject content scripts and CSS filter overrides that invert the question paper viewports on the CodeChef-VIT Papers portal.

## Privacy & Data Use
PaperShade does not track, collect, store, or transmit any user data, personal information, or browsing history. All preference data resides purely within local device storage via `chrome.storage.local`.
