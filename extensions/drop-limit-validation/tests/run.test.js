import { describe, it, expect } from 'vitest';
import { run, parseLimit } from '../src/run.js';

function line({ qty = 1, tagged = true, limit = '2', title = 'Drop Tee' } = {}) {
  return {
    quantity: qty,
    merchandise: {
      __typename: 'ProductVariant',
      product: {
        title,
        hasAnyTag: tagged,
        metafield: limit === null ? null : { value: limit },
      },
    },
  };
}

describe('parseLimit', () => {
  it('parses positive integers', () => {
    expect(parseLimit('2')).toBe(2);
  });
  it('rejects zero, negatives, decimals and garbage (fail open)', () => {
    expect(parseLimit('0')).toBeNull();
    expect(parseLimit('-3')).toBeNull();
    expect(parseLimit('1.5')).toBeNull();
    expect(parseLimit('two')).toBeNull();
    expect(parseLimit('')).toBeNull();
    expect(parseLimit(null)).toBeNull();
  });
});

describe('run', () => {
  it('passes a cart with no drop products', () => {
    expect(run({ cart: { lines: [line({ tagged: false, qty: 99 })] } }).errors).toEqual([]);
  });

  it('passes at exactly the limit', () => {
    expect(run({ cart: { lines: [line({ qty: 2 })] } }).errors).toEqual([]);
  });

  it('blocks above the limit with a message naming the product and the limit', () => {
    const { errors } = run({ cart: { lines: [line({ qty: 3 })] } });
    expect(errors).toHaveLength(1);
    expect(errors[0].localizedMessage).toContain('max 2');
    expect(errors[0].localizedMessage).toContain('Drop Tee');
  });

  it('reports every offending line, not just the first', () => {
    const { errors } = run({
      cart: { lines: [line({ qty: 3 }), line({ qty: 5, title: 'Drop Shorts' })] },
    });
    expect(errors).toHaveLength(2);
  });

  it('fails open when the limit metafield is missing or invalid', () => {
    expect(run({ cart: { lines: [line({ qty: 99, limit: null })] } }).errors).toEqual([]);
    expect(run({ cart: { lines: [line({ qty: 99, limit: 'abc' })] } }).errors).toEqual([]);
  });

  it('never throws on undefined input', () => {
    expect(() => run(undefined)).not.toThrow();
    expect(run(undefined).errors).toEqual([]);
  });
});
