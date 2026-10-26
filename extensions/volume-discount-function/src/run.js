// @ts-check
/**
 * Product Discount Function — team/club volume pricing.
 *
 * Rules:
 *  - Only cart lines whose product has the `team-eligible` tag participate.
 *  - Tiers come from the shop metafield `$app:volume-discount.tiers` (JSON array
 *    of { minQuantity, percentage }), merchant-editable without a deploy.
 *  - The tier is chosen on the TOTAL eligible quantity across the cart
 *    (3 jerseys + 2 shorts = 5 units -> first tier), because team managers
 *    buy assortments, not 10 of the same SKU.
 *  - The discount applies to every eligible line, once, as a percentage.
 *
 * Failure policy: fail OPEN. Malformed config or unexpected input must result
 * in "no discount", never in a thrown error — a crashing function degrades
 * checkout for everyone.
 *
 * @typedef {{ minQuantity: number, percentage: number }} Tier
 */

const EMPTY = /** @type {const} */ ({ discounts: [], discountApplicationStrategy: 'FIRST' });

/**
 * @param {object} input - Function input (see src/run.graphql)
 * @returns {{ discounts: object[], discountApplicationStrategy: string }}
 */
export function run(input) {
  const tiers = parseTiers(input?.shop?.metafield?.value);
  if (tiers.length === 0) return EMPTY;

  const eligibleLines = (input?.cart?.lines ?? []).filter(
    (line) =>
      line?.merchandise?.__typename === 'ProductVariant' &&
      line.merchandise.product?.hasAnyTag === true &&
      line.quantity > 0
  );
  if (eligibleLines.length === 0) return EMPTY;

  const totalQuantity = eligibleLines.reduce((sum, line) => sum + line.quantity, 0);

  const tier = pickTier(tiers, totalQuantity);
  if (!tier) return EMPTY;

  return {
    discountApplicationStrategy: 'FIRST',
    discounts: [
      {
        message: `Team pricing −${tier.percentage}%`,
        targets: eligibleLines.map((line) => ({
          productVariant: { id: line.merchandise.id },
        })),
        value: {
          percentage: { value: String(tier.percentage) },
        },
      },
    ],
  };
}

/**
 * Parse and sanitise the tier config. Anything invalid is dropped silently.
 * @param {string | null | undefined} raw
 * @returns {Tier[]} tiers sorted by minQuantity ascending
 */
export function parseTiers(raw) {
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (t) =>
        t &&
        Number.isFinite(t.minQuantity) &&
        t.minQuantity > 0 &&
        Number.isFinite(t.percentage) &&
        t.percentage > 0 &&
        t.percentage <= 100
    )
    .sort((a, b) => a.minQuantity - b.minQuantity);
}

/**
 * Highest tier whose threshold is met.
 * @param {Tier[]} tiers - sorted ascending by minQuantity
 * @param {number} quantity
 * @returns {Tier | undefined}
 */
export function pickTier(tiers, quantity) {
  let selected;
  for (const tier of tiers) {
    if (quantity >= tier.minQuantity) selected = tier;
  }
  return selected;
}

export default run;
