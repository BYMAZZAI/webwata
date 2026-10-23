'use strict';
(() => {
  const C = window.CAKE_CONFIG;
  const $ = (q) => document.querySelector(q);
  const $$ = (q) => [...document.querySelectorAll(q)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const MOTION_MS = 750;
  let scrollAnimation = 0;
  function animateEntry(element, distance = 12) {
    if (reduceMotion.matches || !element || typeof element.animate !== 'function') return;
    element.getAnimations().forEach((animation) => animation.cancel());
    element.animate([{ opacity: .25, translate: `0 ${distance}px` }, { opacity: 1, translate: '0 0' }], { duration: MOTION_MS, easing: 'cubic-bezier(.22,.68,.24,1)' });
  }
  function smoothScrollTo(target) {
    if (!target) return;
    cancelAnimationFrame(scrollAnimation);
    const startY = window.scrollY;
    const destination = Math.max(0, Math.min(startY + target.getBoundingClientRect().top - $('.header').getBoundingClientRect().height - 16, document.documentElement.scrollHeight - innerHeight));
    if (reduceMotion.matches) { window.scrollTo({ top: destination, behavior: 'instant' }); return; }
    const start = performance.now();
    const frame = (now) => {
      const p = Math.min((now - start) / MOTION_MS, 1);
      const eased = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      window.scrollTo({ top: startY + (destination - startY) * eased, behavior: 'instant' });
      if (p < 1) scrollAnimation = requestAnimationFrame(frame);
    };
    scrollAnimation = requestAnimationFrame(frame);
  }
  const money = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';
  const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = { step: 0, tiers: 1, filling: 'strawberry', decor: 'berries', inscription: '', inspiration: '' };
  const galleryNames = ['Клубничный бантик', 'Фисташковое настроение', 'Шоколадный праздник', 'Тихая нежность', 'Белый шёлк', 'Розовое облако', 'Мишкин день', 'Выше облаков', 'Радуга внутри', 'Маленькое сердечко', 'Ромашковое утро', 'Вишенка для двоих'];
  const categoryNames = { birthday: 'День рождения', wedding: 'Свадьба', kids: 'Детский', bento: 'Бенто' };
  const gallery = galleryNames.map((name, i) => ({ id: i + 1, name, category: ['birthday', 'wedding', 'kids', 'bento'][Math.floor(i / 3)], decor: i < 3 ? 'berries' : i < 6 ? 'flowers' : i < 9 ? 'sprinkles' : 'cream' }));
  let filter = 'all';
  let galleryIndex = 0;
  let displayedPrice = 0;
  let priceAnimation = 0;
  let preparedOrder = null;
  let sending = false;
  let lastPayloadJSON = '';
  let lastRequestKey = '';
  let toastTimer;
  const isDemo = () => C.demo || !C.endpoint;
  const filling = () => C.fillings.find((f) => f.id === state.filling);
  const decor = () => C.decors.find((d) => d.id === state.decor);
  const tier = () => C.tiers.find((t) => t.id === state.tiers);
  const calculatePrice = (s = state) => C.tiers.find((t) => t.id === s.tiers).price + C.fillings.find((f) => f.id === s.filling).price * s.tiers + C.decors.find((d) => d.id === s.decor).price + (s.inscription.trim() ? C.inscriptionPrice : 0);
  const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function validate(data) {
    const errors = {};
    if (!/^[\p{L}\p{M}\s'’\-]{2,80}$/u.test(data.name.trim())) errors.name = 'Укажите имя: от 2 до 80 букв.';
    const digits = data.phone.replace(/\D/g, '');
    if (!/^[78]\d{10}$/.test(digits)) errors.phone = 'Укажите российский номер: +7 и ещё 10 цифр.';
    const d = new Date(data.date + 'T12:00:00');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !Number.isFinite(+d) || d.getFullYear() !== Number(data.date.slice(0, 4)) || d.getMonth() + 1 !== Number(data.date.slice(5, 7)) || d.getDate() !== Number(data.date.slice(8, 10))) errors.date = 'Выберите корректную дату праздника.';
    else if (data.date < localDate()) errors.date = 'Дата праздника не может быть в прошлом.';
    if (!data.consent) errors.consent = 'Для продолжения необходимо ваше согласие.';
    return errors;
  }
  // Pure domain helpers for focused verification without a browser.
  window.CAKE_DOMAIN = { calculatePrice, validate, localDate };
  function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3400); }
  function clearPreparedOrder() { preparedOrder = null; $('#download-order').hidden = true; $('#form-result').hidden = true; }
  function summary() { return `${tier().name} · ${filling().name} · ${decor().name}${state.inscription.trim() ? ' · «' + state.inscription.trim() + '»' : ''}`; }
  function animatePrice(target) {
    cancelAnimationFrame(priceAnimation);
    if (reduceMotion.matches || !displayedPrice) { displayedPrice = target; $('#price').textContent = money(target); return; }
    const start = performance.now(), from = displayedPrice;
    const frame = (now) => { const p = Math.min((now - start) / MOTION_MS, 1); displayedPrice = from + (target - from) * (1 - (1 - p) ** 3); $('#price').textContent = money(displayedPrice); if (p < 1) priceAnimation = requestAnimationFrame(frame); };
    priceAnimation = requestAnimationFrame(frame);
  }
  function berry(x, y, scale = 1) { return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-9 0 Q-17 14 0 25 Q17 14 9 0Z" fill="#ce5973"/><path d="M-10 0L-3-3 0-10 4-3 11 0 3 3 0 0-4 3Z" fill="#7ca98b"/><g fill="#f6d5af"><circle cx="-5" cy="8" r="1"/><circle cx="4" cy="10" r="1"/><circle cx="0" cy="17" r="1"/></g></g>`; }
  function flower(x, y, scale = 1) { return `<g transform="translate(${x} ${y}) scale(${scale})">${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="0" cy="-9" rx="5" ry="10" fill="#fffdf2" stroke="#edd9bd" stroke-width=".5" transform="rotate(${a})"/>`).join('')}<circle r="5" fill="#e8bd68"/></g>`; }
  function renderCake(drop = false) {
    const count = state.tiers, f = filling();
    let svg = '<defs><linearGradient id="frosting" x1="0" x2="1"><stop stop-color="#f5c5d3"/><stop offset=".45" stop-color="#ffe2e9"/><stop offset="1" stop-color="#edb7cb"/></linearGradient><linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#eff6ef"/><stop offset="1" stop-color="#b7d4c3"/></linearGradient></defs><ellipse cx="240" cy="350" rx="155" ry="15" fill="#e7c9be" opacity=".42"/><path d="M220 320h40l10 25h-60Z" fill="#bfd7c5"/><ellipse cx="240" cy="347" rx="70" ry="9" fill="url(#plate)"/><ellipse cx="240" cy="317" rx="161" ry="18" fill="url(#plate)"/>';
    for (let i = 0; i < count; i++) {
      const width = 270 - i * 60, x = 240 - width / 2, y = 243 - i * 68;
      const scallops = Math.floor(width / 18), segment = width / scallops;
      const creamEdge = `M${x} ${y}v7` + Array.from({ length: scallops }, () => `q${segment / 2} 17 ${segment} 0`).join('') + `V${y}Z`;
      svg += `<g class="cake-tier${drop ? ' drop' : ''}" style="--tier-index:${i}"><rect x="${x}" y="${y}" width="${width}" height="70" rx="10" fill="url(#frosting)"/><path d="M${x} ${y + 43}h${width}v8H${x}Z" fill="${f.color}" opacity=".7"/><ellipse cx="240" cy="${y + 67}" rx="${width / 2}" ry="9" fill="#edb8cb"/><ellipse cx="240" cy="${y}" rx="${width / 2}" ry="14" fill="#fff3ee"/><path d="${creamEdge}" fill="#fff3ee"/>`;
      if (state.decor === 'cream') for (let j = 0; j < 11; j++) svg += `<circle cx="${x + 12 + j * (width - 24) / 10}" cy="${y + 60}" r="7" fill="#fff2ed" stroke="#eab6c8" stroke-width="1"/>`;
      if (state.decor === 'sprinkles') for (let j = 0; j < 20; j++) svg += `<rect x="${x + 12 + (j * 37) % (width - 25)}" y="${y + 20 + (j * 17) % 33}" width="6" height="2.5" rx="1" fill="${['#be627d', '#80ab90', '#e9b95c', '#9470aa'][j % 4]}" transform="rotate(${(j % 3) * 30 - 30} ${x + 12 + (j * 37) % (width - 25)} ${y + 20 + (j * 17) % 33})"/>`;
      if (i === count - 1) {
        if (state.decor === 'berries') svg += berry(220, y - 16, .95) + berry(251, y - 20, 1.1) + berry(271, y - 9, .75);
        if (state.decor === 'flowers') svg += flower(214, y - 12, 1) + flower(245, y - 23, 1.1) + flower(273, y - 4, .8);
        if (state.decor === 'cream') svg += [210, 240, 270].map((cx) => `<path d="M${cx - 9} ${y - 6}q-7-10 5-13q-3-10 6-15q-3 8 4 15q9 8-4 15Z" fill="#fff4ef" stroke="#edc3d3" stroke-width="1"/>`).join('');
        if (state.decor === 'sprinkles') svg += `<path d="M236 ${y - 3}v-30" stroke="#dd9c61" stroke-width="5"/><path d="M236 ${y - 37}q-8-10 0-18q9 10 0 18Z" fill="#edbd5c"/>`;
      }
      svg += '</g>';
    }
    const text = state.inscription.trim();
    if (text) svg += `<text x="240" y="279" fill="#693b51" font-size="${text.length > 20 ? 11 : 14}" text-anchor="middle" font-family="Trebuchet MS,Arial,sans-serif"${text.length > 22 ? ' textLength="205" lengthAdjust="spacingAndGlyphs"' : ''}>${escapeHTML(text)}</text>`;
    $('#cake-svg').innerHTML = svg;
    $('#cake-svg').setAttribute('aria-label', 'Иллюстрация: ' + summary());
  }
  function update(drop = false, motion = true) {
    clearPreparedOrder();
    renderCake(drop);
    if (!drop && motion) animateEntry($('#cake-svg'), 4);
    const price = calculatePrice(); animatePrice(price);
    $('#cake-description').textContent = `${tier().name} · ${filling().name} · ${decor().name}`;
    $('#order-summary').textContent = summary() + (state.inspiration ? ' · Вдохновение: ' + state.inspiration : '');
    $('#order-price').textContent = `${tier().weight}, ${money(price)} — демонстрационный расчёт, доставка отдельно`;
  }
  function optionHTML(item, type) {
    const selected = type === 'tiers' ? state.tiers === item.id : state[type] === item.id;
    const extra = type === 'filling' ? `<span class="option-color" aria-hidden="true" style="background:${item.color}"></span>` : type === 'decor' ? `<span class="decor-symbol" aria-hidden="true">${item.symbol}</span>` : '';
    const amount = type === 'tiers' ? money(item.price) : item.price ? '+ ' + money(item.price) + (type === 'filling' ? ' / ярус' : '') : 'В основе';
    return `<label class="option"><input type="radio" name="${type}" value="${item.id}" ${selected ? 'checked' : ''}>${extra}<span><span class="option-name">${item.name}</span><span class="option-detail">${item.detail || item.short}${item.weight ? ' · ' + item.weight : ''}</span></span><span class="option-price">${amount}</span></label>`;
  }
  function renderStep(focus = false) {
    const steps = [
      ['Начнём с размаха', 'Выберите размер вашего праздника. Вес и цены — примеры.', C.tiers, 'tiers'],
      ['Что прячется внутри?', 'Пять сочетаний — выберите то, которое ближе вам.', C.fillings, 'filling'],
      ['Добавим характер', 'Сдержанно, ягодно или с россыпью ярких деталей?', C.decors, 'decor'],
      ['Самое важное — в двух словах', 'До 36 символов. Можно оставить торт без надписи.', null, null]
    ];
    const [title, description, items, type] = steps[state.step];
    $('#step-panel').innerHTML = `<h3>${title}</h3><p class="step-description">${description}</p>` + (items ? `<fieldset class="options"><legend class="sr-only">${title}</legend>${items.map((i) => optionHTML(i, type)).join('')}</fieldset>` : `<label class="inscription-label" for="inscription">Надпись на торте</label><textarea class="inscription-input" id="inscription" maxlength="36" placeholder="Например: Ты моё счастье" aria-describedby="inscription-help">${escapeHTML(state.inscription)}</textarea><div class="input-help" id="inscription-help"><span>Пример доплаты: ${money(C.inscriptionPrice)}</span><span id="char-count">${state.inscription.length}/36</span></div><div class="inscription-preview"><p>Слова, которые запомнятся</p><b id="text-preview"></b></div>`);
    if (state.step === 3) $('#text-preview').textContent = state.inscription || 'Торт без надписи ♡';
    $$('.step-tabs button').forEach((b, i) => { if (i === state.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); b.classList.toggle('done', i < state.step); });
    $('.progress').setAttribute('aria-valuenow', String(state.step + 1));
    $('.progress>span').style.width = `${(state.step + 1) * 25}%`;
    $('#step-number').textContent = `Шаг ${state.step + 1} из 4`;
    $('#prev-step').disabled = state.step === 0;
    $('#next-step').innerHTML = state.step === 3 ? 'К заявке <span aria-hidden="true">↗</span>' : 'Дальше <span aria-hidden="true">→</span>';
    if (focus) { $('#step-panel').focus({ preventScroll: true }); animateEntry($('#step-panel')); }
  }
  $('.step-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-step]'); if (b) { state.step = Number(b.dataset.step); renderStep(true); } });
  $('#prev-step').addEventListener('click', () => { if (state.step > 0) { state.step--; renderStep(true); } });
  $('#next-step').addEventListener('click', () => { if (state.step < 3) { state.step++; renderStep(true); } else { if (window.CAKE_CHECKOUT) { window.CAKE_CHECKOUT.open({ mode: 'custom', snapshot: { ...state } }); return; } smoothScrollTo($('#order')); setTimeout(() => $('#customer-name').focus({ preventScroll: true }), reduceMotion.matches ? 0 : MOTION_MS); } });
  $('#step-panel').addEventListener('change', (e) => { if (e.target.matches('input[type=radio]')) { const name = e.target.name; state[name] = name === 'tiers' ? Number(e.target.value) : e.target.value; update(name === 'tiers'); } });
  $('#step-panel').addEventListener('input', (e) => { if (e.target.id === 'inscription') { state.inscription = e.target.value.slice(0, 36); $('#char-count').textContent = `${state.inscription.length}/36`; $('#text-preview').textContent = state.inscription || 'Торт без надписи ♡'; update(false, false); } });
  $('#gallery-grid').innerHTML = gallery.map((g) => `<article class="gallery-card" data-category="${g.category}" data-id="${g.id}"><button type="button" aria-label="Посмотреть AI-пример «${g.name}»" data-gallery-id="${g.id}"><div class="gallery-photo"><img src="assets/cake-${g.id}.webp" alt="AI-пример торта «${g.name}»" width="600" height="636" loading="lazy" decoding="async"><span class="gallery-tag">${categoryNames[g.category]}</span><span class="zoom-mark" aria-hidden="true">↗</span></div><h3>${g.name}</h3><p>AI-дизайн · заменить работой клиента</p></button></article>`).join('');
  function filteredGallery() { return gallery.filter((g) => filter === 'all' || g.category === filter); }
  function filterGallery(nextFilter) {
    const nodes = $$('.gallery-card'), old = new Map(nodes.filter((n) => !n.hidden).map((n) => [n, n.getBoundingClientRect()]));
    filter = nextFilter;
    $$('.filters button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
    nodes.forEach((node) => { node.getAnimations().forEach((a) => a.cancel()); node.hidden = filter !== 'all' && node.dataset.category !== filter; });
    if (!reduceMotion.matches) nodes.filter((n) => !n.hidden).forEach((n) => { const a = old.get(n), b = n.getBoundingClientRect(); n.animate(a ? [{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px)`, opacity: .6 }, { transform: 'translate(0,0)', opacity: 1 }] : [{ transform: 'translateY(14px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: MOTION_MS, easing: 'cubic-bezier(.22,.68,.24,1)' }); });
    $('#gallery-empty').hidden = filteredGallery().length > 0;
    $('#gallery-status').textContent = `Показано тортов: ${filteredGallery().length}`;
  }
  $('.filters').addEventListener('click', (e) => { const b = e.target.closest('[data-filter]'); if (b) filterGallery(b.dataset.filter); });
  function showGalleryImage() { const list = filteredGallery(), g = list[galleryIndex]; if (!reduceMotion.matches) $('#dialog-image').classList.add('image-pending'); $('#dialog-image').src = `assets/cake-${g.id}.webp`; $('#dialog-image').alt = 'AI-пример: ' + g.name; $('#gallery-dialog-title').textContent = g.name; $('#gallery-position').textContent = `${galleryIndex + 1} / ${list.length}`; }
  function openDialog(dialog) { dialog.showModal(); document.body.classList.add('is-dialog-open'); animateEntry(dialog); }
  async function closeDialog(dialog) {
    if (dialog.dataset.closing === 'true') return;
    dialog.dataset.closing = 'true';
    if (!reduceMotion.matches && typeof dialog.animate === 'function') {
      dialog.getAnimations().forEach((a) => a.cancel());
      try { await dialog.animate([{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 12px' }], { duration: MOTION_MS, easing: 'cubic-bezier(.22,.68,.24,1)' }).finished; } catch (_) { /* Motion setting or a new action may cancel it. */ }
    }
    dialog.close(); delete dialog.dataset.closing;
  }
  $$('dialog').forEach((d) => { d.addEventListener('close', () => document.body.classList.remove('is-dialog-open')); d.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog(d); }); d.querySelector('[data-close]').addEventListener('click', () => closeDialog(d)); d.addEventListener('click', (e) => { if (e.target === d) { const r = d.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog(d); } }); });
  $('#gallery-grid').addEventListener('click', (e) => { const b = e.target.closest('[data-gallery-id]'); if (b) { galleryIndex = filteredGallery().findIndex((g) => g.id === Number(b.dataset.galleryId)); showGalleryImage(); openDialog($('#gallery-dialog')); } });
  function galleryMove(delta) { const n = filteredGallery().length; galleryIndex = (galleryIndex + delta + n) % n; showGalleryImage(); }
  $('#gallery-prev').addEventListener('click', () => galleryMove(-1)); $('#gallery-next').addEventListener('click', () => galleryMove(1));
  $('#gallery-dialog').addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); galleryMove(e.key === 'ArrowRight' ? 1 : -1); } });
  $('#choose-design').addEventListener('click', async () => { const g = filteredGallery()[galleryIndex]; state.decor = g.decor; state.inspiration = g.name; if (g.category === 'wedding') state.tiers = 2; if (g.category === 'bento') state.tiers = 1; state.step = 2; renderStep(); update(true); await closeDialog($('#gallery-dialog')); smoothScrollTo($('#constructor')); toast('Идея добавлена в заявку. Точный дизайн нужно согласовать.'); });
  $('#fillings-grid').innerHTML = C.fillings.map((f, i) => `<article class="filling-card"><div class="filling-image"><img src="assets/filling-${i + 1}.webp" alt="AI-пример среза: ${f.name}" width="500" height="560" loading="lazy" decoding="async"></div><h3>${f.name}</h3><p>${f.description}</p><button class="text-link" type="button" data-filling="${f.id}">Хочу эту начинку ↗</button></article>`).join('');
  $('#fillings-grid').addEventListener('click', (e) => { const b = e.target.closest('[data-filling]'); if (b) { state.filling = b.dataset.filling; state.step = 1; renderStep(); update(); if (window.CAKE_CHECKOUT) window.CAKE_CHECKOUT.open({mode:'custom',snapshot:{...state}}); else smoothScrollTo($('#constructor')); toast('Начинка выбрана: ' + filling().name); } });
  const menu = $('#navigation'), toggle = $('.menu-toggle');
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (link?.hasAttribute('data-open-checkout')) return;
    if (!link || e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || (e.button && e.button !== 0)) return;
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault(); smoothScrollTo(target);
    try { window.history.replaceState(null, '', link.getAttribute('href')); } catch (_) { /* Local file browsing may restrict history changes. */ }
    if (e.detail === 0 || link.classList.contains('skip-link')) setTimeout(() => { if (!target.hasAttribute('tabindex')) { target.setAttribute('tabindex', '-1'); target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true }); } target.focus({ preventScroll: true }); }, reduceMotion.matches ? 0 : MOTION_MS);
  });
  ['wheel', 'touchstart'].forEach((event) => document.addEventListener(event, () => cancelAnimationFrame(scrollAnimation), { passive: true }));
  document.addEventListener('keydown', (e) => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', 'Escape', ' '].includes(e.key)) cancelAnimationFrame(scrollAnimation); });
  function closeMenu() { menu.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Открыть меню'); }
  toggle.addEventListener('click', () => { const open = !menu.classList.contains('open'); menu.classList.toggle('open', open); toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню'); });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.header')) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('open')) { closeMenu(); toggle.focus(); } });
  window.addEventListener('resize', () => { if (innerWidth > 930) closeMenu(); });
  if (window.matchMedia('(pointer:fine)').matches) $('.hero').addEventListener('pointermove', (e) => { if (reduceMotion.matches) return; const r = $('.hero').getBoundingClientRect(); $('.sprinkles').style.setProperty('--dx', `${(e.clientX - r.left - r.width / 2) * .018}px`); $('.sprinkles').style.setProperty('--dy', `${(e.clientY - r.top - r.height / 2) * .018}px`); }, { passive: true });
  $('.hero').addEventListener('pointerleave', () => { $('.sprinkles').style.setProperty('--dx', '0px'); $('.sprinkles').style.setProperty('--dy', '0px'); });
  const fieldIds = { name: 'customer-name', phone: 'customer-phone', date: 'celebration-date', consent: 'consent' };
  function showErrors(errors) { Object.keys(fieldIds).forEach((key) => { const input = $('#' + fieldIds[key]); input.setAttribute('aria-invalid', String(Boolean(errors[key]))); $('#' + key + '-error').textContent = errors[key] || ''; }); }
  $('#celebration-date').min = localDate();
  $('#customer-phone').addEventListener('blur', (e) => { let digits = e.target.value.replace(/\D/g, ''); if (/^[78]\d{10}$/.test(digits)) { digits = '7' + digits.slice(1); e.target.value = `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`; } });
  $('#order-form').addEventListener('input', (e) => { if (!sending) clearPreparedOrder(); const key = Object.keys(fieldIds).find((k) => fieldIds[k] === e.target.id); if (key) { e.target.removeAttribute('aria-invalid'); $('#' + key + '-error').textContent = ''; } });
  function confetti() { if (reduceMotion.matches) return; const box = $('#confetti'); box.innerHTML = Array.from({ length: 70 }, () => `<i style="--x:${Math.random() * 100}%;--c:${['#d67c9a', '#99c5aa', '#e9b95c', '#b4a0cc'][Math.floor(Math.random() * 4)]};--delay:${Math.random() * .7}s;--drift:${(Math.random() - .5) * 220}px"></i>`).join(''); setTimeout(() => { box.innerHTML = ''; }, 3500); }
  $('#order-form').addEventListener('submit', async (e) => {
    e.preventDefault(); if (sending) return;
    const fields = { name: $('#customer-name').value.trim(), phone: $('#customer-phone').value.trim(), date: $('#celebration-date').value, consent: $('#consent').checked };
    const errors = validate(fields); showErrors(errors);
    if (Object.keys(errors).length) { $('#' + fieldIds[Object.keys(errors)[0]]).focus(); return; }
    const payload = { ...fields, phone: '+7' + fields.phone.replace(/\D/g, '').slice(1), cake: { ...state, step: undefined }, estimate: calculatePrice(), estimateIsExample: true, currency: 'RUB', deliveryIncluded: false, source: 'sakharnaya-vata', consentVersion: 'draft-2026-10' };
    const result = $('#form-result'); result.hidden = false; result.classList.remove('error'); $('#download-order').hidden = true;
    if (isDemo()) { preparedOrder = payload; result.textContent = 'Заявка проверена, но не отправлена: приём заявок ещё не подключён. Скачайте детали и передайте их кондитеру после получения контактов.'; $('#download-order').hidden = false; confetti(); result.focus({ preventScroll: true }); return; }
    sending = true; $('#submit-order').disabled = true; $('#submit-order').textContent = 'Отправляем…'; result.textContent = 'Передаём вашу заявку…';
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    const serializedPayload = JSON.stringify(payload);
    if (serializedPayload !== lastPayloadJSON) { lastRequestKey = crypto.randomUUID(); lastPayloadJSON = serializedPayload; }
    const requestId = lastRequestKey;
    try {
      const response = await fetch(C.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestId }, body: JSON.stringify(payload), signal: controller.signal, credentials: 'omit' });
      if (!response.ok) throw new Error('http');
      const confirmation = await response.json();
      if (confirmation.ok !== true || typeof confirmation.requestId !== 'string' || !confirmation.requestId) throw new Error('confirmation');
      result.textContent = 'Заявка принята. Номер: ' + confirmation.requestId.slice(0, 80) + '. Заказ и дату необходимо подтвердить с кондитером.'; confetti();
    } catch (error) { result.classList.add('error'); result.textContent = 'Не удалось подтвердить отправку. Данные остались в форме. Скачайте заявку; перед повторной отправкой уточните, не была ли она уже получена.'; preparedOrder = payload; $('#download-order').hidden = false; }
    finally { clearTimeout(timer); sending = false; $('#submit-order').disabled = false; $('#submit-order').innerHTML = 'Отправить заявку <span aria-hidden="true">↗</span>'; result.focus({ preventScroll: true }); }
  });
  $('#download-order').addEventListener('click', () => { if (!preparedOrder) return; const o = preparedOrder; const cakeText = `${C.tiers.find((t) => t.id === o.cake.tiers).name}; ${C.fillings.find((f) => f.id === o.cake.filling).name}; ${C.decors.find((d) => d.id === o.cake.decor).name}`; const text = `САХАРНАЯ ВАТА — ПОДГОТОВЛЕННАЯ ЗАЯВКА\n\nИмя: ${o.name}\nТелефон: ${o.phone}\nДата праздника: ${o.date}\nТорт: ${cakeText}\nНадпись: ${o.cake.inscription || 'Без надписи'}\nВдохновение: ${o.cake.inspiration || 'Не выбрано'}\nПредварительно: ${money(o.estimate)} — демонстрационные цены, доставка не включена.\n\nЭТОТ ФАЙЛ НЕ ОТПРАВЛЯЕТСЯ АВТОМАТИЧЕСКИ. Передайте его кондитеру.\nСостав, вес, цена, дата и получение требуют подтверждения.\n`; const url = URL.createObjectURL(new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'Заявка_Сахарная_вата.txt'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
  $('#privacy-open').addEventListener('click', () => openDialog($('#privacy-dialog'))); $('#privacy-footer').addEventListener('click', () => openDialog($('#privacy-dialog')));
  if (!isDemo()) { $('#submit-order').innerHTML = 'Отправить заявку <span aria-hidden="true">↗</span>'; $('#form-notice').textContent = 'Отправьте заявку для согласования. Выбранная дата и стоимость требуют подтверждения кондитером.'; }
  if (C.phone || C.address) { const el = $('#contact-details'); el.textContent = ''; if (C.phone) { const a = document.createElement('a'); a.href = 'tel:' + C.phone.replace(/[^+\d]/g, ''); a.textContent = C.phone; el.append(a); } if (C.address) { const span = document.createElement('span'); span.textContent = C.address; span.style.display = 'block'; el.append(span); } }
  $('#year').textContent = String(new Date().getFullYear());
  // Independent accessible FAQ panels: opening one does not close another.
  $('.faq-list').classList.add('faq-ready');
  $$('.faq-question').forEach((button) => {
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    const setOpen = (open) => { button.setAttribute('aria-expanded', String(open)); panel.classList.toggle('is-open', open); panel.setAttribute('aria-hidden', String(!open)); panel.inert = !open; };
    setOpen(false);
    button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  });
  // Keep each img element in place so the gallery can recover after a failed image.
  $$('img').forEach((img) => {
    const ready = () => { img.hidden = false; img.classList.remove('image-pending'); if (img._fallback) { img._fallback.remove(); img._fallback = null; } };
    const failed = () => { ready(); img.hidden = true; const fallback = document.createElement('span'); fallback.className = 'image-fallback'; fallback.textContent = img.classList.contains('cotton-logo') ? 'СВ' : 'Фотография нужна от клиента'; img._fallback = fallback; img.insertAdjacentElement('afterend', fallback); };
    img.addEventListener('load', ready); img.addEventListener('error', failed);
    if (img.getAttribute('src')) { if (img.complete) { if (!img.naturalWidth) failed(); } else if (!reduceMotion.matches) img.classList.add('image-pending'); }
  });
  // Reveal once, with no blur and no permanently hidden content if observation fails.
  const revealTargets = $$('.section-heading, .hero-copy, .hero-art, .build-invitation, .builder-layout, .how-grid article, .reviews-grid article, .filling-card, .gallery-card, .order-copy, #order-form, .faq-list');
  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    let observer;
    try {
      observer = new window.IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); } }), { threshold: .08, rootMargin: '0px 0px -24px 0px' });
      revealTargets.forEach((element, index) => { element.classList.add('reveal-pending'); element.style.setProperty('--reveal-delay', `${index % 3 * 55}ms`); observer.observe(element); });
    } catch (_) { revealTargets.forEach((element) => element.classList.remove('reveal-pending')); if (observer) observer.disconnect(); }
  }
  reduceMotion.addEventListener?.('change', () => { if (reduceMotion.matches) { cancelAnimationFrame(scrollAnimation); revealTargets.forEach((element) => element.classList.add('is-revealed')); $$('img.image-pending').forEach((img) => img.classList.remove('image-pending')); document.getAnimations?.().forEach((a) => a.cancel()); } });
  window.CAKE_BRIDGE = { snapshot: () => ({ ...state }), catalog: gallery.map(g => ({ ...g })) };
  renderStep(); update();
})();
