document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('enabledToggle');
  toggle.addEventListener('change', () => {
    console.log('Toggled:', toggle.checked);
  });
});
