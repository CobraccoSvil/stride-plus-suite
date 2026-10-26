// @ts-check
/**
 * Cart & Checkout Validation Function — fair access to limited drops.
 *
 * Products tagged `limited-drop` carry a product metafield
 * `$app:drop-limit.max_per_order` (integer). If any cart line exceeds its
 * product's limit, checkout is blocked with a clear error attached to the
 * quantity field of the offending line.
 *
 * Failure policy: fail OPEN — a product without a parseable limit is treated
 * as unlimited. Validation must never block a legitimate checkout because of
 * bad data entry.
 */

/**
 * @param {object} input - Function input (see src/run.graphql)
 * @returns {{ errors: Array<{ localizedMessage: string, target: string }> }}
 */
export function run(input) {
  const errors = [];

  for (const line of input?.cart?.lines ?? []) {
    if (line?.merchandise?.__typename !== 'ProductVariant') continue;

    const product = line.merchandise.product;
    if (product?.hasAnyTag !== true) continue;

    const limit = parseLimit(product?.metafield?.value);
    if (limit === null) continue; // unlimited / misconfigured -> fail open

    if (line.quantity > limit) {
      errors.push({
        localizedMessage: `Limited drop: max ${limit} per order for "${product.title ?? 'this product'}".`,
        target: '$.cart',
      });
    }
  }

  return { errors };
}

/**
 * @param {string | null | undefined} raw
 * @returns {number | null} positive integer limit, or null when not enforceable
 */
export function parseLimit(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export default run;
