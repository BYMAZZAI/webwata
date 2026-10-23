(() => {
  'use strict';
  const root = document.createElement('div');
  root.className = 'cream-streams';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = '<div class="cream-flow cream-flow-left"></div><div class="cream-flow cream-flow-right"></div>';
  document.body.append(root);
  const lanes = [...root.children];
  const CHUNK = 720; // Four seamless 180 px tiles; only on-screen chunks animate.
  const sections = [
    ['.hero', '#e7a0b4'], ['#constructor', '#e7b4b8'],
    ['#gallery', '#bed0a3'], ['#fillings', '#b68c75'],
    ['#how', '#edc680'], ['.reviews-section', '#dca3b6'],
    ['#faq', '#c8b8d8'], ['#order', '#e7a0b4'], ['.footer', '#e7a0b4']
  ].map(([selector, color]) => ({element:document.querySelector(selector), color}));
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('is-flowing', entry.isIntersecting));
  }, {rootMargin:'80px 0px', threshold:0}) : null;
  let previous = '';
  function draw() {
    // Read layout once in a batch, before making style or DOM changes.
    const bodyTop = document.body.getBoundingClientRect().top;
    const boxes = sections.map(({element}) => element?.getBoundingClientRect());
    if (!boxes[0] || !boxes[boxes.length-1]) return;
    const top = Math.round(boxes[0].top - bodyTop);
    const height = Math.ceil(boxes[boxes.length-1].bottom - bodyTop - top);
    const positions = boxes.map(box => box ? Math.round(box.top-bodyTop-top) : 0);
    const signature = [top,height,...positions].join(',');
    if (signature === previous) return;
    previous = signature;
    const stops = [{y:0,color:sections[0].color}];
    sections.slice(1).forEach(({color}, i) => {
      if (!boxes[i+1]) return;
      const y = positions[i+1];
      stops.push({y:Math.max(0,y-145),color:sections[i].color},{y:Math.min(height,y+145),color});
    });
    stops.push({y:height,color:sections[sections.length-1].color});
    const gradient = `linear-gradient(to bottom,${stops.map(({y,color})=>`${color} ${Math.max(0,Math.min(100,y/height*100)).toFixed(3)}%`).join(',')})`;
    root.style.top = `${top}px`;
    root.style.height = `${height}px`;
    root.style.setProperty('--cream-height', `${height}px`);
    root.style.setProperty('--cream-colors', gradient);
    const count = Math.ceil(height/CHUNK);
    lanes.forEach(lane => {
      while (lane.children.length > count) {
        const chunk = lane.lastElementChild;
        observer?.unobserve(chunk);
        chunk.remove();
      }
      for (let i=0;i<count;i++) {
        let chunk = lane.children[i];
        if (!chunk) {
          chunk = document.createElement('div');
          chunk.className = 'cream-chunk';
          chunk.innerHTML = '<span class="cream-current"></span>';
          chunk.style.top = `${i*CHUNK}px`;
          chunk.style.setProperty('--chunk-y', `${i*CHUNK}px`);
          lane.append(chunk);
          if (observer) observer.observe(chunk); else chunk.classList.add('is-flowing');
        }
        chunk.style.height = `${Math.min(CHUNK,height-i*CHUNK)}px`;
      }
    });
  }
  let timer;
  // FAQ height transitions can fire ResizeObserver every frame. Wait for them to settle.
  const queue = () => { clearTimeout(timer); timer = setTimeout(draw, 160); };
  if ('ResizeObserver' in window) {
    const resize = new ResizeObserver(queue);
    resize.observe(document.querySelector('main'));
    resize.observe(document.querySelector('.footer'));
  }
  window.addEventListener('resize', queue, {passive:true});
  window.addEventListener('load', queue, {once:true});
  draw();
})();
