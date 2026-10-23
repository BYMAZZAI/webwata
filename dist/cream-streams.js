(() => {
  'use strict';
  const root = document.createElement('div');
  root.className = 'cream-streams';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = '<div class="cream-flow cream-flow-left"></div><div class="cream-flow cream-flow-right"></div>';
  document.body.append(root);
  const sections = [
    ['.hero', '#e7a0b4'], ['#constructor', '#e7b4b8'],
    ['#gallery', '#bed0a3'], ['#fillings', '#b68c75'],
    ['#how', '#edc680'], ['.reviews-section', '#dca3b6'],
    ['#faq', '#c8b8d8'], ['#order', '#e7a0b4'], ['.footer', '#e7a0b4']
  ];
  function draw() {
    const first = document.querySelector('.hero');
    const footer = document.querySelector('.footer');
    if (!first || !footer) return;
    const bodyTop = document.body.getBoundingClientRect().top;
    const top = first.getBoundingClientRect().top - bodyTop;
    const height = Math.ceil(footer.getBoundingClientRect().bottom - bodyTop - top);
    root.style.top = `${top}px`;
    root.style.height = `${height}px`;
    let d = 'M 70 -100';
    for (let y = -100; y < height + 180; y += 180) d += ` C 108 ${y+50}, 32 ${y+130}, 70 ${y+180}`;
    const stops = [{y:0, color:sections[0][1]}];
    sections.slice(1).forEach(([selector, color], i) => {
      const section = document.querySelector(selector);
      if (!section) return;
      const y = section.getBoundingClientRect().top - bodyTop - top;
      stops.push({y:Math.max(0,y-145),color:sections[i][1]}, {y:Math.min(height,y+145),color});
    });
    stops.push({y:height,color:sections[sections.length-1][1]});
    const gradient = stops.map(({y,color}) => `<stop offset="${Math.max(0,Math.min(100,y/height*100)).toFixed(3)}%" stop-color="${color}"/>`).join('');
    root.querySelectorAll('.cream-flow').forEach((lane, i) => {
      const id = `cream-${i}`;
      lane.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="${height}" viewBox="0 0 140 ${height}" preserveAspectRatio="none" focusable="false"><defs><linearGradient id="${id}-flavour" x1="0" y1="0" x2="0" y2="1">${gradient}</linearGradient><linearGradient id="${id}-glaze" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#88445d" stop-opacity=".18"/><stop offset=".25" stop-color="#fff8eb" stop-opacity=".05"/><stop offset=".43" stop-color="#fff9ef" stop-opacity=".65"/><stop offset=".68" stop-color="#fff7e9" stop-opacity=".14"/><stop offset="1" stop-color="#8b4053" stop-opacity=".2"/></linearGradient></defs><path d="${d}" fill="none" stroke="#94566a" stroke-opacity=".08" stroke-width="53" transform="translate(2 3)"/><path d="${d}" fill="none" stroke="url(#${id}-flavour)" stroke-width="48"/><path d="${d}" fill="none" stroke="url(#${id}-glaze)" stroke-width="48"/><path class="cream-flow-highlight" d="${d}" fill="none" stroke="#fff9ee" stroke-width="8" stroke-linecap="round" stroke-dasharray="55 75 15 140" opacity=".4"/><path class="cream-flow-ripple" d="${d}" fill="none" stroke="#fffaf2" stroke-width="26" stroke-linecap="round" stroke-dasharray="2 283" opacity=".14"/></svg>`;
    });
  }
  let frame;
  const queue = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); };
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(queue);
    observer.observe(document.querySelector('main'));
    observer.observe(document.querySelector('.footer'));
  }
  window.addEventListener('resize', queue, {passive:true});
  window.addEventListener('load', queue, {once:true});
  draw();
})();
