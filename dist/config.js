/* Редактируйте каталог и примеры цен здесь. Перед запуском подтвердите данные. */
window.CAKE_CONFIG = {
  demo: true,
  endpoint: '', // HTTPS API: POST JSON → {"ok":true,"requestId":"..."}. Секреты только на сервере.
  phone: '',
  address: '',
  tiers: [
    { id: 1, name: 'Один ярус', detail: 'Небольшой праздник', price: 3200, weight: '≈ 2 кг' },
    { id: 2, name: 'Два яруса', detail: 'Когда собираются все', price: 6400, weight: '≈ 4 кг' },
    { id: 3, name: 'Три яруса', detail: 'Для большого события', price: 9600, weight: '≈ 6 кг' }
  ],
  fillings: [
    { id: 'strawberry', name: 'Клубника со сливками', short: 'Нежная классика', description: 'Ванильный бисквит, сливочный крем и клубничная прослойка.', color: '#e9a1a9', price: 0 },
    { id: 'chocolate', name: 'Шоколад и карамель', short: 'Для любителей шоколада', description: 'Шоколадный бисквит, какао-крем и солёная карамель.', color: '#805142', price: 350 },
    { id: 'pistachio', name: 'Фисташка и малина', short: 'Яркая ягодная нота', description: 'Фисташковый бисквит, сливочный крем и малиновая прослойка.', color: '#b4c995', price: 550 },
    { id: 'velvet', name: 'Красный бархат', short: 'Бархатный характер', description: 'Красный бисквит с лёгкой нотой какао и крем-чиз.', color: '#b94d61', price: 250 },
    { id: 'mango', name: 'Манго и маракуйя', short: 'Маленькие тропики', description: 'Ванильный бисквит, мусс с манго и прослойка из маракуйи.', color: '#ecc16c', price: 400 }
  ],
  decors: [
    { id: 'berries', name: 'Ягоды', detail: 'Клубника и ягодные акценты', price: 600, symbol: '✿' },
    { id: 'cream', name: 'Кремовые узоры', detail: 'Винтажные завитки и волны', price: 400, symbol: '〰' },
    { id: 'flowers', name: 'Цветы', detail: 'Нежные цветочные детали', price: 900, symbol: '❀' },
    { id: 'sprinkles', name: 'Посыпка', detail: 'Цветные искры праздника', price: 250, symbol: '☁' }
  ],
  inscriptionPrice: 200
};

// Все цены каталога — примеры. Перед приёмом реальных заказов заменить прайсом клиента.
window.CAKE_CONFIG.menuPrices = [3800,4200,4400,7600,7200,11200,4800,4300,4900,1400,1300,1500];
