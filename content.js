// Content script for paper viewer
(() => {
  'use strict';
  console.log('[PaperShade] Loaded on papers.codechefvit.com');
  document.documentElement.setAttribute('data-papershade-enabled', 'true');
})();
