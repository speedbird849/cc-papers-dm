(() => {
  'use strict';
  function applyInversion() {
    document.documentElement.setAttribute('data-papershade-enabled', 'true');
    document.documentElement.classList.add('papershade-active');
    tagPaperImages();
  }

  function tagPaperImages() {
    requestAnimationFrame(() => {
      const viewerImages = document.querySelectorAll(
        '[data-pdf-viewer-theme] img, div[style*="width"][style*="height"] > img, [data-pdf-viewer-theme] canvas'
      );
      viewerImages.forEach((img) => {
        if (!img.classList.contains('papershade-target-img')) {
          img.classList.add('papershade-target-img');
        }
      });
    });
  }

  applyInversion();

  const observer = new MutationObserver(() => {
    tagPaperImages();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
