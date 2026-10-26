import { describe, it, expect } from 'vitest';
import { run, parseTiers, pickTier } from '../src/run.js';

const TIERS = JSON.stringify([
  { minQuantity: 5, percentage: 10 },
  { minQuantity: 10, percentage: 15 },
  { minQuantity: 25, percentage: 20 },
]);

function line({ id = 'gid://shopify/ProductVariant/1', qty = 1, eligible = true } = {}) {
  return {
    quantity: qty,
    merchandise: {
      __typename: 'ProductVariant',
      id,
      product: { hasAnyTag: eligible },
    },
  };
}

function input(lines, tiersRaw = TIERS) {
  return { cart: { lines }, shop: { metafield: tiersRaw === null ? null : { value: tiersRaw } } };
}

describe('parseTiers', () => {
  it('parses and sorts valid config', () => {
    const raw = JSON.stringify([
      { minQuantity: 10, percentage: 15 },
      { minQuantity: 5, percentage: 10 },
    ]);
    expect(parseTiers(raw).map((t) => t.minQuantity)).toEqual([5, 10]);
  });

  it('returns [] on malformed JSON (fail open)', () => {
    expect(parseTiers('{not json')).toEqual([]);
  });

  it('drops invalid entries (negative, >100%, missing fields)', () => {
    const raw = JSON.stringify([
      { minQuantity: -1, percentage: 10 },
      { minQuantity: 5, percentage: 150 },
      { minQuantity: 5 },
      { minQuantity: 5, percentage: 10 },
    ]);
    expect(parseTiers(raw)).toEqual([{ minQuantity: 5, percentage: 10 }]);
  });

  it('returns [] when metafield is absent', () => {
    expect(parseTiers(null)).toEqual([]);
    expect(parseTiers(undefined)).toEqual([]);
  });
});

describe('pickTier', () => {
  const tiers = parseTiers(TIERS);

  it('returns undefined below the first threshold', () => {
    expect(pickTier(tiers, 4)).toBeUndefined();
  });

  it('is inclusive at the boundary', () => {
    expect(pickTier(tiers, 5)?.percentage).toBe(10);
    expect(pickTier(tiers, 10)?.percentage).toBe(15);
    expect(pickTier(tiers, 25)?.percentage).toBe(20);
  });

  it('selects the highest matching tier', () => {
    expect(pickTier(tiers, 12)?.percentage).toBe(15);
    expect(pickTier(tiers, 999)?.percentage).toBe(20);
  });
});

describe('run', () => {
  it('returns no discounts for an empty cart', () => {
    expect(run(input([])).discounts).toEqual([]);
  });

  it('returns no discounts below the threshold (4 eligible units)', () => {
    const result = run(input([line({ qty: 4 })]));
    expect(result.discounts).toEqual([]);
  });

  it('applies the first tier at exactly 5 eligible units', () => {
    const result = run(input([line({ qty: 5 })]));
    expect(result.discounts).toHaveLength(1);
    expect(result.discounts[0].value.percentage.value).toBe('10');
  });

  it('sums quantity ACROSS eligible lines (3 jerseys + 2 shorts = tier 1)', () => {
    const result = run(
      input([
        line({ id: 'gid://shopify/ProductVariant/1', qty: 3 }),
        line({ id: 'gid://shopify/ProductVariant/2', qty: 2 }),
      ])
    );
    expect(result.discounts).toHaveLength(1);
    expect(result.discounts[0].targets).toHaveLength(2);
  });

  it('ignores non-eligible lines in the count and in the targets', () => {
    const result = run(
      input([
        line({ id: 'gid://shopify/ProductVariant/1', qty: 5 }),
        line({ id: 'gid://shopify/ProductVariant/2', qty: 20, eligible: false }),
      ])
    );
    expect(result.discounts[0].value.percentage.value).toBe('10'); // 5, not 25
    expect(result.discounts[0].targets).toHaveLength(1);
  });

  it('fails open on malformed tier config', () => {
    const result = run(input([line({ qty: 50 })], '{broken'));
    expect(result.discounts).toEqual([]);
  });

  it('fails open when metafield is missing entirely', () => {
    const result = run({ cart: { lines: [line({ qty: 50 })] }, shop: {} });
    expect(result.discounts).toEqual([]);
  });

  it('never throws on undefined input', () => {
    expect(() => run(undefined)).not.toThrow();
    expect(run(undefined).discounts).toEqual([]);
  });
});
