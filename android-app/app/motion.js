/* Decorative motion has no task clock. Work is bounded to visible home elements. */
let directoryEntranceDone = false;
const enteredCards = new WeakSet();
const cardEntrances = new WeakMap();
const homeVisibility = new Map();
let homeScrollFrame = 0;

function installCardHover(link) {
  let frame = 0, x = 0, y = 0;
  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    link.style.removeProperty('--tilt-x');
    link.style.removeProperty('--tilt-y');
  };
  link.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || reducedMotion() || activeModule !== null || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    const bounds = link.getBoundingClientRect();
    x = (event.clientX - bounds.left) / bounds.width - .5;
    y = (event.clientY - bounds.top) / bounds.height - .5;
    if (!frame) frame = requestAnimationFrame(() => {
      frame = 0;
      link.style.setProperty('--tilt-x', (-y * 5).toFixed(2) + 'deg');
      link.style.setProperty('--tilt-y', (x * 6).toFixed(2) + 'deg');
    });
  }, {passive: true});
  link.addEventListener('pointerleave', reset);
  link.addEventListener('pointercancel', reset);
}

function revealCard(card, delay = 0) {
  if (enteredCards.has(card) || reducedMotion() || document.hidden || activeModule !== null) return;
  enteredCards.add(card);
  const animation = card.animate([{opacity: 0, transform: 'translateY(14px)'}, {opacity: 1, transform: 'translateY(0)'}], {
    duration: 430, delay, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards'
  });
  cardEntrances.set(card, animation);
  animation.finished.catch(() => {}).finally(() => {
    if (cardEntrances.get(card) === animation) cardEntrances.delete(card);
  });
}

function syncHomeMotion() {
  for (const [element, visible] of homeVisibility) element.classList.toggle('home-motion', visible && activeModule === null && !document.hidden && !reducedMotion());
}

function stopHomeMotion() {
  for (const element of homeVisibility.keys()) element.classList.remove('home-motion');
  $('recentCard').classList.remove('recent-float');
  for (const card of document.querySelectorAll('.training-card')) {
    const entrance = cardEntrances.get(card);
    if (entrance) { entrance.cancel(); enteredCards.delete(card); cardEntrances.delete(card); }
  }
}

function enterDirectory(first) {
  syncHomeMotion();
  if (reducedMotion() || document.hidden) return;
  const cards = [...document.querySelectorAll('.training-card')];
  const visible = cards.filter(el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
  visible.forEach((el, i) => revealCard(el, Math.min(i * 45, 180)));
  if (first && !directoryEntranceDone) {
    directoryEntranceDone = true;
    for (const [index, el] of [...document.querySelectorAll('.hero-content,.welcome-art,.today-strip,.recent-card')].entries()) {
      if (el.hidden) continue;
      el.animate([{opacity: 0, transform: 'translateY(12px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 500, delay: index * 45, easing: 'cubic-bezier(.2,.8,.2,1)'});
    }
    const observer = new IntersectionObserver(entries => {
      entries.filter(e => e.isIntersecting).forEach((entry, i) => revealCard(entry.target, Math.min(i * 35, 140)));
    }, {threshold: .08});
    cards.forEach(card => observer.observe(card));
  }
}

const artObserver = new IntersectionObserver(entries => {
  for (const entry of entries) homeVisibility.set(entry.target, entry.isIntersecting);
  syncHomeMotion();
});
for (const id of ['todayArt', 'welcomeArt']) artObserver.observe($(id));
document.addEventListener('scroll', () => {
  if (homeScrollFrame) return;
  homeScrollFrame = requestAnimationFrame(() => {
    homeScrollFrame = 0;
    $('recentCard').classList.remove('recent-float');
  });
}, {passive: true});
document.addEventListener('visibilitychange', () => document.hidden ? stopHomeMotion() : syncHomeMotion());