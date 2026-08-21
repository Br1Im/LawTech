/**
 * LT-019. Качество лида по предзаказу Правоведа.
 *
 * До правки все лиды сохранялись с score = 50 и были неразличимы,
 * хотя у поставщика каждый поток — отдельный предзаказ со своей ценой.
 */
const { resolveQuality, parsePrice, priceFromCategories, DEFAULT_QUALITY } =
  require('../services/leadQuality');

describe('LT-019 качество лида по предзаказу', () => {
  const mapping = new Map([
    ['1001', { label: 'premium', score: 95 }],
    ['1002', { label: 'basic', score: 20 }],
  ]);

  test('явное соответствие важнее цены', () => {
    const q = resolveQuality({ id: 1002, lead_price: 5000 }, mapping);
    expect(q.label).toBe('basic');
    expect(q.score).toBe(20);
    expect(q.source).toBe('preorder');
  });

  test('ID предзаказа сравнивается как строка, число из API тоже подходит', () => {
    expect(resolveQuality({ id: 1001 }, mapping).label).toBe('premium');
    expect(resolveQuality({ id: '1001' }, mapping).label).toBe('premium');
  });

  test('неизвестный предзаказ определяется по цене', () => {
    const q = resolveQuality({ id: 7777, lead_price: 1500 }, mapping);
    expect(q.label).toBe('premium');
    expect(q.source).toBe('price');
  });

  test('пороги цены не пересекаются', () => {
    const at = (price) => resolveQuality({ id: 999, lead_price: price }, mapping).label;
    expect(at(1500)).toBe('premium');
    expect(at(1499)).toBe('high');
    expect(at(900)).toBe('high');
    expect(at(899)).toBe('standard');
    expect(at(400)).toBe('standard');
    expect(at(399)).toBe('basic');
    expect(at(0)).toBe('basic');
  });

  test('без цены и без соответствия — прежнее поведение, score 50', () => {
    const q = resolveQuality({ id: 4242 }, mapping);
    expect(q.score).toBe(DEFAULT_QUALITY.score);
    expect(q.label).toBeNull();
    expect(q.source).toBe('default');
  });

  test('цена берётся из категорий, если lead_price пуст', () => {
    const q = resolveQuality(
      { id: 4242, lead_category_types: { 'Семейное право': 900, 'Жильё': 1600 } },
      mapping
    );
    expect(q.price).toBe(1600);
    expect(q.label).toBe('premium');
  });

  test('цена разбирается из строк с пробелами и запятой', () => {
    expect(parsePrice('1 200,50')).toBe(1200.5);
    expect(parsePrice('1200')).toBe(1200);
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('без цены')).toBeNull();
  });

  test('категории без чисел не ломают расчёт', () => {
    expect(priceFromCategories(null)).toBeNull();
    expect(priceFromCategories({})).toBeNull();
    expect(priceFromCategories({ a: 'нет' })).toBeNull();
  });

  test('score не выходит за 0..100 даже при кривом соответствии', () => {
    const bad = new Map([['5', { label: 'x', score: 999 }], ['6', { label: 'y', score: -5 }]]);
    expect(resolveQuality({ id: 5 }, bad).score).toBe(100);
    expect(resolveQuality({ id: 6 }, bad).score).toBe(0);
  });

  test('пустые соответствия не ломают расчёт', () => {
    expect(resolveQuality({ id: 1, lead_price: 1000 }, new Map()).label).toBe('high');
    expect(resolveQuality({ id: 1, lead_price: 1000 }, undefined).label).toBe('high');
  });
});
