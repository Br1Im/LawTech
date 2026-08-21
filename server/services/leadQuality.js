/**
 * Качество лида по предзаказу Правоведа.
 *
 * У поставщика каждый поток — отдельный предзаказ со своим ID и ценой
 * (см. поля lead_price и lead_category_types в GET /restv2/preorders/).
 * Раньше все лиды сохранялись с score = 50 и были неразличимы.
 *
 * Порядок определения:
 *   1. явное соответствие «ID предзаказа → метка» в lead_preorder_quality;
 *   2. если предзаказа там нет — по цене лида.
 *
 * Второй шаг нужен, чтобы новый поток не потерялся, если его забыли завести
 * руками: лид всё равно получит осмысленную метку, а не константу.
 */

// Пороги в рублях. Значение попадает в интервал [min, max).
const PRICE_TIERS = [
  { label: 'premium', minPrice: 1500, score: 90 },
  { label: 'high', minPrice: 900, score: 75 },
  { label: 'standard', minPrice: 400, score: 55 },
  { label: 'basic', minPrice: 0, score: 35 },
];

const DEFAULT_QUALITY = { label: null, score: 50, source: 'default' };

/** Приводит цену из API к числу. Строки вида "1 200,50" тоже встречаются. */
function parsePrice(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const normalized = String(raw).replace(/\s+/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  if (!normalized) return null;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Сумма по категориям — запасной источник цены, если lead_price пуст.
 * lead_category_types в API это объект вида { "категория": цена }.
 */
function priceFromCategories(categories) {
  if (!categories || typeof categories !== 'object') return null;
  const values = Object.values(categories).map(parsePrice).filter((v) => v !== null && v > 0);
  if (!values.length) return null;
  return Math.max(...values);
}

function tierByPrice(price) {
  if (price === null || price < 0) return null;
  const tier = PRICE_TIERS.find((t) => price >= t.minPrice);
  return tier ? { label: tier.label, score: tier.score, source: 'price' } : null;
}

/**
 * @param {object} preorder      предзаказ из API
 * @param {Map<string,object>} mapping  ID предзаказа -> { label, score }
 * @returns {{label: string|null, score: number, source: string, price: number|null}}
 */
function resolveQuality(preorder, mapping) {
  const preorderId = preorder && preorder.id !== undefined && preorder.id !== null
    ? String(preorder.id)
    : null;

  const price = parsePrice(preorder && preorder.lead_price) ??
    priceFromCategories(preorder && preorder.lead_category_types);

  if (preorderId && mapping && mapping.has(preorderId)) {
    const explicit = mapping.get(preorderId);
    return {
      label: explicit.label,
      score: clampScore(explicit.score),
      source: 'preorder',
      price,
    };
  }

  const byPrice = tierByPrice(price);
  if (byPrice) return { ...byPrice, price };

  return { ...DEFAULT_QUALITY, price };
}

function clampScore(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return DEFAULT_QUALITY.score;
  return Math.min(100, Math.max(0, n));
}

/** Читает соответствия из БД в Map. Пустая таблица — не ошибка. */
async function loadMapping(db, provider = 'pravoved') {
  const [rows] = await db.query(
    `SELECT preorder_id, label, score
       FROM lead_preorder_quality
      WHERE provider = ? AND is_active = 1`,
    [provider]
  );
  const mapping = new Map();
  for (const row of rows) {
    mapping.set(String(row.preorder_id), { label: row.label, score: row.score });
  }
  return mapping;
}

module.exports = {
  resolveQuality,
  loadMapping,
  parsePrice,
  priceFromCategories,
  PRICE_TIERS,
  DEFAULT_QUALITY,
};
