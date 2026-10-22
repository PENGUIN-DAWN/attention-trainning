/* Decorative motion is independent of every task clock and stimulus. No fixed-rate timers. */
let directoryEntranceDone = false;

function stopHomeMotion() {
  $('recentCard').classList.remove('recent-float');
  for (const el of [$('homeView'), ...document.querySelectorAll('.training-card')])
    for (const animation of el.getAnimations()) animation.cancel();
}

function enterDirectory(first) {
  if (reducedMotion() || document.hidden) return;
  if (first && !directoryEntranceDone) {
    directoryEntranceDone = true;
    const visible = [...document.querySelectorAll('.training-card')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight;
    });
    visible.forEach((el, i) => el.animate([{
      opacity: 0,
      transform: 'translateY(8px)'
    }, {
      opacity: 1,
      transform: 'translateY(0)'
    }], {
      duration: 240,
      delay: Math.min(i * 30, 120),
      easing: 'cubic-bezier(.2,.7,.2,1)'
    }));
    if (!$('recentCard').hidden) $('recentCard').classList.add('recent-float');
  }
}
document.addEventListener('scroll', () => {
  $('recentCard').classList.remove('recent-float');
}, {
  passive: true
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopHomeMotion();
});
new IntersectionObserver(entries => {
  for (const entry of entries)
    if (!entry.isIntersecting) entry.target.classList.remove('recent-float');
}).observe(document.getElementById('recentCard'));
