(() => {
  'use strict';
  function applyInversion() {
    document.documentElement.setAttribute('data-papershade-enabled', 'true');
    document.documentElement.classList.add('papershade-active');
  }
  applyInversion();
})();
