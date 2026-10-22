/* Inline vectors only: no icon font, emoji or network asset in application chrome. */
function appIcon(name, className = '') {
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    records: '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 3h6v4H9zM9 11h6m-6 4h4"/>',
    settings: '<path d="m10 3-1 3-3 1-3 3 2 3v4l4 1 2 3h3l2-3 4-1v-4l2-3-3-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    back: '<path d="m14 5-7 7 7 7"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    spark: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6m4-6v6"/>',
    export: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M14 3v6h6M14 3l6 6M8 15l3-3 3 3m-3-3v7"/>',
    import: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M14 3v6h6M14 3l6 6M8 16l3 3 3-3m-3 3v-7"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
    motion: '<path d="M3 8c4-8 6 8 10 0s6 8 8 0M3 16c4-8 6 8 10 0s6 8 8 0"/>',
    trophy: '<path d="M8 3h8v6a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 13v5m-5 3h10m-9-3h8v3"/>',
    orbit: '<circle cx="12" cy="12" r="6"/><ellipse cx="12" cy="12" rx="11" ry="3.5" transform="rotate(-30 12 12)"/><path d="m19 3 .5-2M4 19l-2 2"/>',
    leaf: '<path d="M20 3C6 2 1 10 7 17c7 6 15 1 13-14ZM4 21 16 9"/>',
    pause: '<path d="M8 5v14m8-14v14"/>',
  };
  return '<svg class="ui-icon ' + className + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (paths[name] || paths.spark) + '</svg>';
}

function decorateIconSlots(root = document) {
  for (const slot of root.querySelectorAll('[data-icon]')) slot.innerHTML = appIcon(slot.dataset.icon);
}
