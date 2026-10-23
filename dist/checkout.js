'use strict';
(() => {
  const C = window.CAKE_CONFIG, bridge = window.CAKE_BRIDGE;
  if (!C || !bridge) return;
  const $ = s => document.querySelector(s);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';
  const krasnodarNow = () => { const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value])); return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`}; };
  const dayString = (d = null) => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : krasnodarNow().date;
  const catalog = bridge.catalog.map((g,i) => ({...g, price:C.menuPrices[i], image:`assets/cake-${g.id}.webp`}));
  const toppings = [...C.decors, {id:'chocolate',name:'Шоколадные акценты',detail:'Кусочки шоколада и ягоды в шоколаде',price:700}, {id:'none',name:'Без посыпки',detail:'Лаконичное кремовое покрытие',price:0}];
  const customSteps = ['Ярусы','Начинка','Посыпка','Надпись','Дата и время','Контакты'];
  const menuSteps = ['Меню-Торт','Дата и пожелания','Контакты'];
  const initial = () => ({mode:null,step:0,reached:0,tiers:1,many:false,filling:'strawberry',decor:'berries',inscription:'',comment:'',date:'',time:'',name:'',phone:'',consent:false,menuId:null,locked:false});
  let order = initial(), saved = null, sending = false, opener = null, lastFingerprint = '', lastKey = '', closing = false;
  let calendarMonth = new Date(dayString().slice(0,7)+'-01T12:00:00');
  const dialog = document.createElement('dialog');
  dialog.id='checkout-dialog'; dialog.className='checkout-dialog'; dialog.setAttribute('aria-labelledby','checkout-title');
  dialog.innerHTML=`<div class="checkout-shell"><header class="checkout-header"><div><p class="eyebrow">Сахарная вата / ваша сладкая история</p><h2 id="checkout-title">Какой торт <em>создадим?</em></h2></div><button type="button" class="checkout-close circle-button" aria-label="Закрыть оформление заказа">×</button></header><div class="checkout-categories"></div><div class="checkout-workspace" hidden><div class="checkout-progress-head"><button type="button" class="text-link" id="checkout-category-back">← Категории</button><span id="checkout-count"></span></div><nav class="checkout-steps" aria-label="Этапы оформления"></nav><div class="checkout-meter" role="progressbar" aria-label="Прогресс заказа" aria-valuemin="1" aria-valuemax="6" aria-valuenow="1"><span></span></div><div class="checkout-grid"><div class="checkout-left"><div id="checkout-panel" tabindex="-1"></div><p class="checkout-error" id="checkout-error" role="alert"></p><div class="checkout-actions"><button class="text-link" type="button" id="checkout-prev">← Назад</button><button class="button" type="button" id="checkout-next">Дальше →</button></div><div id="checkout-result" class="form-result" role="status" tabindex="-1" hidden></div><button type="button" class="button full mint" id="checkout-download" hidden>Скачать заявку ↓</button></div><aside class="checkout-preview"><div class="checkout-preview-top"><span>Собираем ваш праздник</span><span class="live-label"><i></i> Ваш выбор</span></div><div class="cake-assembly" id="cake-assembly" role="img" aria-label="Торт на подносе"></div><div class="checkout-preview-info"><span class="compact-step-label"></span><h3 id="checkout-preview-name"></h3><p id="checkout-preview-detail"></p><div class="checkout-price"><span>Примерная цена<small>Демонстрационный расчёт</small></span><strong id="checkout-price"></strong></div><p class="checkout-small">Изображение — иллюстрация. Дизайн, вес, дату, время и стоимость подтверждает кондитер. Доставка отдельно.</p></div></aside></div></div></div>`;
  document.body.append(dialog);
  const q = s => dialog.querySelector(s);
  const filling = () => C.fillings.find(f=>f.id===order.filling);
  const topping = () => toppings.find(d=>d.id===order.decor);
  const menuCake = () => catalog.find(c=>c.id===order.menuId);
  const steps = () => order.mode==='custom'?customSteps:menuSteps;
  function estimate(o=order) {
    if(o.mode==='menu')return catalog.find(c=>c.id===o.menuId)?.price ?? 0;
    const base=C.tiers.find(t=>t.id===o.tiers)?.price ?? C.tiers[2].price/3*o.tiers;
    return base+C.fillings.find(f=>f.id===o.filling).price*o.tiers+toppings.find(t=>t.id===o.decor).price+(o.inscription.trim()?C.inscriptionPrice:0);
  }
  function dateError(date,time) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return 'Выберите дату праздника в календаре.';
    const d=new Date(date+'T12:00:00');
    if(!Number.isFinite(+d)||dayString(d)!==date||date<dayString())return 'Выберите существующую дату, начиная с сегодняшнего дня.';
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return 'Укажите желаемое время.';
    if(date===dayString()&&time<=krasnodarNow().time)return 'Выбранное время уже прошло. Укажите будущее время.';
    return '';
  }
  function validateStep(step=order.step) {
    if(order.mode==='custom') {
      if(step===0&&(!Number.isInteger(order.tiers)||order.tiers<1||order.tiers>8))return 'Укажите от 1 до 8 ярусов.';
      if(step===1&&!filling())return 'Выберите начинку.';
      if(step===2&&!topping())return 'Выберите посыпку или декор.';
      if(step===3&&(order.inscription.length>36||order.comment.length>800))return 'Надпись — до 36 символов, комментарий — до 800.';
    } else if(step===0&&!menuCake())return 'Выберите торт из меню.';
    const dateStep=order.mode==='custom'?4:1;
    if(step===dateStep)return dateError(order.date,order.time);
    if(step===steps().length-1) {
      const fields={name:order.name,phone:order.phone,date:order.date,consent:order.consent};
      const errors=window.CAKE_DOMAIN.validate(fields);
      // Contact validation is reused; date and time use Krasnodar's clock below.
      return errors.name||errors.phone||errors.consent||dateError(order.date,order.time);
    }
    return '';
  }
  function payload() {
    return {category:order.mode==='custom'?'Торт на заказ':'Меню-Торт',name:order.name.trim(),phone:'+7'+order.phone.replace(/\D/g,'').slice(1),date:order.date,time:order.time,timeZone:'Europe/Moscow',city:'Краснодар',comment:order.comment.trim(),consent:order.consent,consentVersion:'draft-2026-10',cake:order.mode==='custom'?{tiers:order.tiers,filling:order.filling,decor:order.decor,inscription:order.inscription.trim()}:{menuId:order.menuId,name:menuCake().name},estimate:estimate(),estimateIsExample:true,currency:'RUB',deliveryIncluded:false};
  }
  function resetResult(){saved=null;q('#checkout-result').hidden=true;q('#checkout-download').hidden=true;q('#checkout-error').textContent='';}
  function flip(el,first) {
    if(reduce.matches||!el.animate)return;
    const last=el.getBoundingClientRect();
    el.animate([{transform:`translate(${first.left-last.left}px,${first.top-last.top}px) scale(${first.width/Math.max(last.width,1)},${first.height/Math.max(last.height,1)})`,opacity:.25},{transform:'none',opacity:1}],{duration:750,easing:'cubic-bezier(.22,.68,.24,1)'});
  }
  function categoryView() {
    order.mode=null;q('.checkout-workspace').hidden=true;q('.checkout-categories').hidden=false;q('#checkout-title').innerHTML='Какой торт <em>создадим?</em>';
    q('.checkout-categories').innerHTML=`<p class="category-intro">Создайте свой торт с нуля или выберите дизайн из меню.</p><div class="category-grid"><button type="button" class="order-category" data-category="custom"><div class="category-image"><img src="assets/decor/cake-mark.webp" alt="" width="200" height="200"></div><span class="eyebrow">Ваш замысел — ваши правила</span><h3>Торт на заказ</h3><p>Ярусы, начинка, посыпка, объёмная надпись и детали праздника.</p><span class="category-arrow">Собрать свой торт ↗</span></button><button type="button" class="order-category" data-category="menu"><div class="category-image menu"><img src="assets/cake-10.webp" alt="" width="200" height="200"></div><span class="eyebrow">Когда уже влюбились в дизайн</span><h3>Меню-Торт</h3><p>Торты из каталога, желаемые дата и время, ваши пожелания.</p><span class="category-arrow">Посмотреть меню ↗</span></button></div><p class="checkout-small centered">Цены и дизайны — примеры. Приём заявок пока не подключён; подготовленный заказ можно скачать.</p>`;
  }
  function activate(mode) {order.mode=mode;order.step=0;order.reached=0;q('.checkout-categories').hidden=true;q('.checkout-workspace').hidden=false;render();}
  const radio=(name,value,title,detail,selected,img='')=>`<label class="checkout-choice${selected?' selected':''}"><input type="radio" name="${name}" value="${value}" ${selected?'checked':''}>${img?`<img src="${img}" alt="" width="48" height="48">`:''}<span><b>${title}</b><small>${detail}</small></span><span class="choice-tick" aria-hidden="true">✓</span></label>`;
  function calendarHTML() {
    const today=dayString(),year=calendarMonth.getFullYear(),month=calendarMonth.getMonth();
    const offset=(new Date(year,month,1).getDay()+6)%7,total=new Date(year,month+1,0).getDate();
    let cells=Array.from({length:offset},()=>'<span class="calendar-blank"></span>').join('');
    for(let day=1;day<=total;day++){const value=dayString(new Date(year,month,day));cells+=`<button type="button" class="calendar-day" data-day="${value}" aria-label="${new Date(year,month,day).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}" aria-pressed="${value===order.date}" ${value<today?'disabled':''}>${day}</button>`;}
    const previous=new Date(year,month,0),prevDisabled=previous<new Date(dayString().slice(0,7)+'-01T12:00:00');
    return `<div class="order-calendar"><div class="calendar-head"><button type="button" class="circle-button" data-month="-1" aria-label="Предыдущий месяц" ${prevDisabled?'disabled':''}>←</button><strong>${calendarMonth.toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}</strong><button type="button" class="circle-button" data-month="1" aria-label="Следующий месяц">→</button></div><div class="calendar-week" aria-hidden="true">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(s=>'<span>'+s+'</span>').join('')}</div><div class="calendar-days" role="group" aria-label="Дни месяца">${cells}</div></div>`;
  }
  function dateFields(menu=false) {return `<div class="checkout-section-title"><span>${menu?'02':'05'} / Планируем праздник</span><h3>Когда нужен торт?</h3><p>Дата и время желаемого получения по Краснодару (UTC+3). Это запрос, а не бронь.</p></div><div id="order-calendar-host">${calendarHTML()}</div><div class="date-time-row"><label>Дата<input id="order-date" type="date" min="${dayString()}" value="${order.date}" required></label><label>Время<input id="order-time" type="time" value="${order.time}" required step="900"></label></div><p class="checkout-small">График и доступность нужно уточнить у кондитера. Неопубликованные часы работы не ограничивают этот предварительный выбор.</p>${menu?commentField():''}`;}
  function commentField(){return `<label class="checkout-label" for="order-comment">Пожелания и комментарий</label><textarea id="order-comment" rows="3" maxlength="800" placeholder="Расскажите о цветах, поводе, аллергиях или деталях оформления">${escape(order.comment)}</textarea><p class="checkout-small">До 800 символов. Особенности состава согласовываются отдельно.</p>`;}
  function contactFields(){return `<div class="checkout-section-title"><span>Почти готово</span><h3>Как с вами связаться?</h3><p>Проверьте выбранный торт и детали праздника.</p></div><div class="checkout-recap"><b>${escape(order.mode==='custom'?order.tiers+' ярус(а) · '+filling().name:menuCake().name)}</b><span>${escape(order.date)} в ${escape(order.time)} · Краснодар</span>${order.inscription?'<span>Надпись: «'+escape(order.inscription)+'»</span>':''}${order.comment?'<span>Комментарий: '+escape(order.comment)+'</span>':''}</div><label class="checkout-label" for="order-client-name">Ваше имя *</label><input id="order-client-name" value="${escape(order.name)}" autocomplete="name" maxlength="80" required placeholder="Как к вам обращаться"><label class="checkout-label" for="order-client-phone">Телефон *</label><input id="order-client-phone" value="${escape(order.phone)}" type="tel" inputmode="tel" autocomplete="tel" maxlength="24" required placeholder="+7 (___) ___-__-__"><label class="check-label checkout-consent"><input id="order-client-consent" type="checkbox" ${order.consent?'checked':''}><span>Согласен(на) на обработку данных для подготовки заявки.<small>В демонстрации данные остаются в этой вкладке. Приём кондитером не подключён. Проект согласия требует проверки перед запуском.</small></span></label>`;}
  function panelHTML() {
    if(order.step===steps().length-1)return contactFields();
    if(order.mode==='menu') {
      if(order.step===1)return dateFields(true);
      const items=order.locked?[menuCake()]:catalog;
      return `<div class="checkout-section-title"><span>01 / Готовые идеи</span><h3>${order.locked?'Ваш выбранный торт':'Выберите торт из меню'}</h3><p>Дизайны и цены — демонстрационные примеры.</p></div><div class="order-menu-grid${order.locked?' single':''}">${items.map(c=>`<label class="menu-cake-option"><input type="radio" name="order-menu" value="${c.id}" ${order.menuId===c.id?'checked':''}><img src="${c.image}" alt="AI-пример ${escape(c.name)}" width="240" height="240" loading="lazy"><span><b>${c.name}</b><small>${money(c.price)} · пример</small></span><i aria-hidden="true">✓</i></label>`).join('')}</div>`;
    }
    if(order.step===0)return `<div class="checkout-section-title"><span>01 / Размер праздника</span><h3>Сколько будет ярусов?</h3><p>Один, два, три — или немного больше.</p></div><fieldset class="checkout-options"><legend class="sr-only">Ярусы</legend>${[1,2,3].map(n=>radio('order-tiers',n,n+' '+(n===1?'ярус':'яруса'),'База '+money(C.tiers[n-1].price),order.tiers===n&&!order.many)).join('')}${radio('order-tiers','many','Несколько ярусов','От 4 до 8 · уточним конструкцию с кондитером',order.many)}</fieldset><div class="more-tiers" ${order.many?'':'hidden'}><label class="checkout-label" for="order-tier-count">Точное количество ярусов</label><input id="order-tier-count" type="number" inputmode="numeric" min="4" max="8" step="1" value="${order.many?order.tiers:4}"></div>`;
    if(order.step===1)return `<div class="checkout-section-title"><span>02 / Самое интересное внутри</span><h3>Выберите начинку</h3><p>Одна начинка для всех ярусов. Сочетания согласуем в комментарии.</p></div><fieldset class="checkout-options"><legend class="sr-only">Начинка</legend>${C.fillings.map((f,i)=>radio('order-filling',f.id,f.name,f.price?'+ '+money(f.price)+' за ярус':'В базовом расчёте',order.filling===f.id,`assets/filling-${i+1}.webp`)).join('')}</fieldset>`;
    if(order.step===2)return `<div class="checkout-section-title"><span>03 / Сладкие детали</span><h3>Посыпка и декор</h3><p>Выберите настроение вашего торта.</p></div><fieldset class="checkout-options"><legend class="sr-only">Посыпка и декор</legend>${toppings.map(t=>radio('order-decor',t.id,t.name,t.price?'+ '+money(t.price):'Без доплаты',order.decor===t.id)).join('')}</fieldset>`;
    if(order.step===3)return `<div class="checkout-section-title"><span>04 / Слова со смыслом</span><h3>Добавьте объёмную надпись</h3><p>Буквы покажем на торте в 3D-оформлении. Реальную технику согласует кондитер.</p></div><label class="checkout-label" for="order-inscription">Надпись на торте</label><input id="order-inscription" value="${escape(order.inscription)}" maxlength="36" placeholder="Например: Ты моё счастье"><p class="checkout-small"><span id="order-letter-count">${order.inscription.length}</span>/36 символов · пример доплаты ${money(C.inscriptionPrice)}</p>${commentField()}`;
    return dateFields();
  }
  function render(focus=false) {
    resetResult();const first=q('#checkout-panel').getBoundingClientRect();
    q('#checkout-title').innerHTML=order.mode==='custom'?'Ваш торт <em>по шагам</em>':'Торт из <em>меню</em>';
    q('#checkout-count').textContent=`Шаг ${order.step+1} из ${steps().length}`;
    q('.checkout-steps').innerHTML=steps().map((s,i)=>`<button type="button" data-order-step="${i}" ${i>order.reached?'disabled':''} ${i===order.step?'aria-current="step"':''}><span>${i+1}</span>${s}</button>`).join('');
    q('.checkout-meter').setAttribute('aria-valuemax',steps().length);q('.checkout-meter').setAttribute('aria-valuenow',order.step+1);q('.checkout-meter>span').style.width=(order.step+1)/steps().length*100+'%';
    q('#checkout-panel').innerHTML=panelHTML();q('#checkout-prev').disabled=order.step===0;
    q('#checkout-next').textContent=order.step===steps().length-1?(C.demo||!C.endpoint?'Подготовить заявку ↗':'Отправить заявку ↗'):'Дальше →';
    preview();if(focus){q('#checkout-panel').focus({preventScroll:true});flip(q('#checkout-panel'),first);q('.checkout-left').scrollTop=0;if(window.matchMedia('(max-width:650px)').matches)q('#checkout-panel').scrollIntoView({behavior:reduce.matches?'instant':'smooth',block:'start'});}
  }
  function preview(drop=false) {
    const stage=q('#cake-assembly');
    if(order.mode==='menu'&&menuCake())stage.innerHTML=`<div class="assembly-menu"><img src="${menuCake().image}" alt="AI-пример выбранного торта ${escape(menuCake().name)}" width="420" height="420"></div><div class="assembly-tray"></div>`;
    else if(order.mode==='menu')stage.innerHTML='<div class="empty-tray-caption">Выберите торт — поставим его на поднос</div><div class="assembly-tray"></div>';
    else {
      const height=Math.min(66,260/order.tiers),top=70+(order.tiers-1)*height;
      let html='<div class="assembly-halo"></div><div class="assembly-tray"></div>';
      for(let i=0;i<order.tiers;i++)html+=`<div class="assembled-tier${drop?' tier-arrive':''}" style="--tier:${i};width:${260-i*19}px;height:${height+8}px;bottom:${70+i*height}px"><span class="tier-filling" style="background:${filling().color}"></span><span class="tier-pipe"></span></div>`;
      if(order.decor==='berries'||order.decor==='chocolate')html+=`<div class="assembly-topping" style="bottom:${top+height-5}px"><img src="assets/decor/${order.decor==='berries'?'strawberry':'chocolate-strawberry'}.webp" alt="" width="55" height="55"><img src="assets/decor/${order.decor==='berries'?'currant':'chocolate-raspberry'}.webp" alt="" width="45" height="45"></div>`;
      if(order.decor==='sprinkles')for(let i=0;i<28;i++)html+=`<i class="assembly-sprinkle" style="left:calc(50% + ${(i*31)%220-110}px);bottom:${82+(i*13)%Math.max(25,order.tiers*height-5)}px;background:${['#df7694','#88b3a0','#e9bd59','#b5a0d2'][i%4]};rotate:${i*27}deg"></i>`;
      if(order.decor==='flowers')html+=`<span class="assembly-flowers" style="bottom:${top+height-15}px" aria-hidden="true">❀ ❀</span>`;
      if(order.decor==='cream')html+=`<span class="assembly-cream" style="bottom:${top+height-9}px" aria-hidden="true">〰 〰 〰</span>`;
      if(order.inscription.trim())html+=`<span class="cake-3d-text" style="bottom:${78+height*.28}px;font-size:${order.inscription.length>20?11:16}px">${escape(order.inscription.trim())}</span>`;
      stage.innerHTML=html;
    }
    stage.innerHTML='<div class="assembly-scene">'+stage.innerHTML+'</div>';
    q('.compact-step-label').textContent=`Шаг ${order.step+1} из ${steps().length}`;
    stage.setAttribute('aria-label',order.mode==='menu'?(menuCake()?.name||'Пустой поднос'):`Торт на подносе: ${order.tiers} ярус(а), ${filling().name}, ${topping().name}${order.inscription?', надпись '+order.inscription:''}`);
    q('#checkout-preview-name').textContent=order.mode==='menu'?(menuCake()?.name||'Ваш будущий торт'):order.tiers+' ярус(а) счастья';
    q('#checkout-preview-detail').textContent=order.mode==='menu'?'Дизайн из меню · AI-пример':filling().name+' · '+topping().name;
    q('#checkout-price').textContent=estimate()?money(estimate()):'—';
  }
  function advance(){if(sending)return;const error=validateStep();if(error){q('#checkout-error').textContent=error;const invalid=q('#checkout-panel input[required]:invalid');if(invalid)invalid.focus();return;}if(order.step===steps().length-1){submit();return;}order.step++;order.reached=Math.max(order.reached,order.step);render(true);}
  async function open(options={}) {
    if(dialog.open)return;
    opener=document.activeElement;order=initial();calendarMonth=new Date(dayString().slice(0,7)+'-01T12:00:00');closing=false;
    const snapshot=options.snapshot||bridge.snapshot();
    if(options.mode==='custom'){Object.assign(order,{tiers:snapshot.tiers||1,filling:snapshot.filling||'strawberry',decor:snapshot.decor||'berries',inscription:snapshot.inscription||''});}
    if(options.cakeId){order.menuId=Number(options.cakeId);order.locked=true;}
    categoryView();if(options.mode)activate(options.mode);if(options.cakeId){activate('menu');order.step=1;order.reached=1;render();}
    dialog.showModal();document.body.classList.add('is-dialog-open');dialog.scrollTop=0;
    if(!reduce.matches&&dialog.animate){const last=dialog.getBoundingClientRect(),first=opener?.getBoundingClientRect()||last;dialog.animate([{opacity:0,transform:`translate(${(first.left+first.width/2)-(last.left+last.width/2)}px,${Math.max(-100,Math.min(100,(first.top+first.height/2)-(last.top+last.height/2)))}px) scale(.84)`},{opacity:1,transform:'none'}],{duration:750,easing:'cubic-bezier(.22,.68,.24,1)'});}
    q('.checkout-close').focus({preventScroll:true});
  }
  async function close(){if(sending||closing)return;closing=true;if(!reduce.matches&&dialog.animate)try{await dialog.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(12px) scale(.985)'}],{duration:280,easing:'ease-out'}).finished;}catch(_){}dialog.close();closing=false;}
  dialog.addEventListener('close',()=>{document.body.classList.remove('is-dialog-open');opener?.focus({preventScroll:true});});
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});q('.checkout-close').addEventListener('click',close);
  dialog.addEventListener('click',e=>{
    if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}
    const category=e.target.closest('[data-category]');if(category){activate(category.dataset.category);return;}
    const nextMonth=e.target.closest('[data-month]');if(nextMonth){calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+Number(nextMonth.dataset.month),1);q('#order-calendar-host').innerHTML=calendarHTML();return;}
    const day=e.target.closest('[data-day]');if(day){order.date=day.dataset.day;resetResult();q('#order-date').value=order.date;q('#order-calendar-host').innerHTML=calendarHTML();return;}
    const step=e.target.closest('[data-order-step]');if(step&&!step.disabled){order.step=Number(step.dataset.orderStep);render(true);}
  });
  q('#checkout-category-back').addEventListener('click',()=>{if(!sending){order=initial();categoryView();}});
  q('#checkout-next').addEventListener('click',advance);q('#checkout-prev').addEventListener('click',()=>{if(!sending&&order.step){order.step--;render(true);}});
  dialog.addEventListener('change',e=>{
    const input=e.target;if(sending)return;resetResult();
    if(input.name==='order-tiers'){order.many=input.value==='many';order.tiers=order.many?4:Number(input.value);render();preview(true);}
    if(input.name==='order-filling'){order.filling=input.value;preview();}
    if(input.name==='order-decor'){order.decor=input.value;preview();}
    if(input.name==='order-menu'){order.menuId=Number(input.value);preview();}
    if(input.id==='order-client-consent')order.consent=input.checked;
  });
  dialog.addEventListener('input',e=>{
    if(sending)return;resetResult();const input=e.target;
    const keys={'order-inscription':'inscription','order-comment':'comment','order-date':'date','order-time':'time','order-client-name':'name','order-client-phone':'phone'};
    if(keys[input.id])order[keys[input.id]]=input.value;
    if(input.id==='order-tier-count'){order.tiers=Number(input.value);if(Number.isInteger(order.tiers)&&order.tiers>=4&&order.tiers<=8)preview(true);}
    if(input.id==='order-inscription'){q('#order-letter-count').textContent=order.inscription.length;preview();}
    if(input.id==='order-date'&&/^\d{4}-\d{2}-\d{2}$/.test(order.date)){calendarMonth=new Date(order.date+'T12:00:00');calendarMonth.setDate(1);q('#order-calendar-host').innerHTML=calendarHTML();}
  });
  dialog.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('input:not([type=radio]):not([type=checkbox])')){e.preventDefault();advance();}});
  function celebration(){if(reduce.matches)return;const box=$('#confetti');box.innerHTML=Array.from({length:60},()=>`<i style="--x:${Math.random()*100}%;--c:${['#d67c9a','#99c5aa','#e9b95c'][Math.floor(Math.random()*3)]};--delay:${Math.random()*.4}s;--drift:${Math.random()*150-75}px"></i>`).join('');setTimeout(()=>box.innerHTML='',3300);}
  async function submit(){
    // Revalidate the whole flow after any backward navigation, not only contacts.
    for(let i=0;i<steps().length;i++){const error=validateStep(i);if(error){order.step=i;render(true);q('#checkout-error').textContent=error;return;}}
    const data=payload(),result=q('#checkout-result');result.hidden=false;result.classList.remove('error');
    if(C.demo||!C.endpoint){saved=data;result.textContent='Заявка подготовлена, но не отправлена кондитеру. Скачайте её: выбранный торт, дата, время и пожелания включены в файл.';q('#checkout-download').hidden=false;celebration();result.focus({preventScroll:true});return;}
    sending=true;q('.checkout-left').setAttribute('aria-busy','true');q('#checkout-panel').inert=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);result.textContent='Отправляем заявку…';const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    const fingerprint=JSON.stringify(data);if(fingerprint!==lastFingerprint){lastFingerprint=fingerprint;lastKey=crypto.randomUUID();}
    try{const response=await fetch(C.endpoint,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':lastKey},body:fingerprint,signal:controller.signal,credentials:'omit'});if(!response.ok)throw Error('HTTP');const confirmation=await response.json();if(confirmation.ok!==true||typeof confirmation.requestId!=='string'||!confirmation.requestId)throw Error('Confirmation');result.textContent='Заявка принята. Номер: '+confirmation.requestId.slice(0,80)+'. Дату, время и стоимость подтвердит кондитер.';celebration();}
    catch(_){saved=data;result.classList.add('error');result.textContent='Не удалось подтвердить отправку. Скачайте заявку; перед повторной отправкой уточните, не была ли она получена.';q('#checkout-download').hidden=false;}
    finally{clearTimeout(timer);sending=false;q('#checkout-panel').inert=false;q('.checkout-left').removeAttribute('aria-busy');dialog.querySelectorAll('button').forEach(b=>b.disabled=false);q('#checkout-prev').disabled=order.step===0;dialog.querySelectorAll('[data-order-step]').forEach(b=>b.disabled=Number(b.dataset.orderStep)>order.reached);result.focus({preventScroll:true});}
  }
  q('#checkout-download').addEventListener('click',()=>{if(!saved)return;const d=saved;const cake=d.category==='Меню-Торт'?d.cake.name:`${d.cake.tiers} ярус(а); ${C.fillings.find(f=>f.id===d.cake.filling).name}; ${toppings.find(t=>t.id===d.cake.decor).name}`;const text=`САХАРНАЯ ВАТА — ПОДГОТОВЛЕННАЯ ЗАЯВКА\n\nКатегория: ${d.category}\nТорт: ${cake}\nНадпись: ${d.cake.inscription||'Без надписи'}\nПожелания: ${d.comment||'Не указаны'}\nДата: ${d.date}\nВремя: ${d.time} по Краснодару (UTC+3)\nИмя: ${d.name}\nТелефон: ${d.phone}\nПредварительно: ${money(d.estimate)} — пример, доставка отдельно.\n\nФАЙЛ НЕ ОТПРАВЛЕН АВТОМАТИЧЕСКИ. Уточните получение, дату, время, состав, вес и цену у кондитера.\n`;const url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Sakharnaya_vata_order.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  document.addEventListener('click',e=>{const trigger=e.target.closest('[data-open-checkout],[data-order-cake]');if(!trigger)return;e.preventDefault();e.stopPropagation();if(trigger.dataset.orderCake)open({cakeId:trigger.dataset.orderCake});else open({mode:trigger.dataset.openCheckout==='custom'?'custom':null});},true);
  document.querySelectorAll('.gallery-card').forEach(card=>{const button=document.createElement('button');button.type='button';button.className='button gallery-order-button';button.dataset.orderCake=card.dataset.id;button.textContent='Заказать этот торт ↗';card.append(button);});
  // Do not animate a ribbon that is outside the viewport.
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('motion-offscreen', !entry.isIntersecting));
  }).observe(document.querySelector('.ribbon'));
  // Pause control for the decorative ribbon.
  const pause=document.createElement('button');pause.type='button';pause.className='inline-link decor-pause';pause.setAttribute('aria-pressed','false');pause.textContent='Приостановить анимации';$('.footer-bottom').append(pause);pause.addEventListener('click',()=>{const on=document.body.classList.toggle('decor-paused');pause.setAttribute('aria-pressed',String(on));pause.textContent=on?'Возобновить анимации':'Приостановить анимации';});
  document.addEventListener('visibilitychange',()=>document.body.classList.toggle('decor-tab-hidden',document.hidden));
  window.CAKE_CHECKOUT={open};
  window.CAKE_CHECKOUT_DOMAIN={estimate,dateError};
})();
