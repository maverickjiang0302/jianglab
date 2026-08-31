/* Theme toggle — shared across all pages */
(function () {
  var saved = localStorage.getItem('jl-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
}());

function toggleTheme() {
  var root = document.documentElement;
  var current = root.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('jl-theme', next);
}

function toggleMobileNav() {
  var sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');
}
