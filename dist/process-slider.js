(() => {
  'use strict';
  const root = document.querySelector('#process-carousel');
  if (!root) return;
  const slides = [...root.querySelectorAll('.process-slide')];
  const dots = [...root.querySelectorAll('[data-process-go]')];
  const pause = root.querySelector('#process-pause');
  const count = root.querySelector('#process-count');
  const status = root.querySelector('#process-status');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0, timer, paused = motion.matches, visible = false, startX = null;
  function syncTimer() {
    clearTimeout(timer);
    if (paused || !visible || document.hidden || root.contains(document.activeElement) || document.querySelector('dialog[open]')) return;
    timer = setTimeout(() => { show(index + 1); }, 3000);
  }
  function show(next, manual = false) {
    const previous = index;
    index = (next + slides.length) % slides.length;
    if (index === previous) { syncTimer(); return; }
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === index);
      slide.classList.toggle('is-entering', i === index);
      slide.classList.toggle('is-leaving', i === previous);
      slide.setAttribute('aria-hidden', String(i !== index));
    });
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
    count.textContent = `${String(index + 1).padStart(2, '0')} / 06`;
    if (manual) status.textContent = `Шаг ${index + 1} из 6. ${slides[index].querySelector('h3').textContent}`;
    syncTimer();
  }
  function updatePause() {
    pause.setAttribute('aria-pressed', String(paused));
    pause.setAttribute('aria-label', paused ? 'Запустить слайд-шоу' : 'Приостановить слайд-шоу');
    pause.innerHTML = paused ? 'Смотреть <span aria-hidden="true">▷</span>' : 'Пауза <span aria-hidden="true">Ⅱ</span>';
    syncTimer();
  }
  root.addEventListener('click', e => {
    const dot = e.target.closest('[data-process-go]');
    const arrow = e.target.closest('[data-process-direction]');
    if (dot) show(Number(dot.dataset.processGo), true);
    if (arrow) show(index + Number(arrow.dataset.processDirection), true);
  });
  pause.addEventListener('click', () => { paused = !paused; updatePause(); });
  root.addEventListener('focusin', syncTimer);
  root.addEventListener('focusout', () => setTimeout(syncTimer, 0));
  root.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault(); show(index + (e.key === 'ArrowRight' ? 1 : -1), true);
  });
  root.querySelector('.process-slides').addEventListener('pointerdown', e => { startX = e.clientX; });
  root.querySelector('.process-slides').addEventListener('pointerup', e => {
    if (startX !== null && Math.abs(e.clientX - startX) > 45) show(index + (e.clientX < startX ? 1 : -1), true);
    startX = null;
  });
  root.addEventListener('pointercancel', () => { startX = null; });
  document.addEventListener('visibilitychange', syncTimer);
  motion.addEventListener('change', () => { paused = motion.matches; updatePause(); });
  new MutationObserver(syncTimer).observe(document.body, {subtree:true, attributes:true, attributeFilter:['open']});
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncTimer(); }, {threshold:.15}).observe(root);
  } else visible = true;
  updatePause();
})();
