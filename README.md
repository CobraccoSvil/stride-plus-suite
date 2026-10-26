# Stride — Shopify Plus extensibility suite for a sportswear brand

> **Demo / showcase project.** Stride is a fictional sportswear brand (running & training apparel) used to demonstrate the Shopify Plus extensibility stack: **Shopify Functions** for pricing and cart validation, **Checkout UI extensions** for conversion-oriented checkout features — all unit-tested and CI-gated.

![CI](https://img.shields.io/badge/tests-passing-brightgreen) ![Functions](https://img.shields.io/badge/Shopify-Functions-blue) ![Checkout](https://img.shields.io/badge/Checkout-UI%20Extensions-blueviolet) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

## What this demonstrates

Discounts hacked into theme JavaScript, quantity limits enforced by hope, checkout logic living in scripts that Shopify is deprecating — these are the patterns this repo replaces with the current, supported Shopify Plus stack:

| Business need | Extension | Tech |
|---|---|---|
| Team/club volume pricing ("buy 5+ jerseys, 10% off; 10+, 15%") | [`volume-discount-function`](extensions/volume-discount-function) | Product Discount **Function** (JS), config via shop metafield |
| Fair access to limited drops (max N units per order) | [`drop-limit-validation`](extensions/drop-limit-validation) | Cart & Checkout **Validation Function** (JS) |
| Fewer size-related returns | [`size-assist-checkout-ui`](extensions/size-assist-checkout-ui) | **Checkout UI extension** (React), metafield-driven size guidance + delivery note attribute |

Full data-flow diagrams in [`docs/architecture.md`](docs/architecture.md).

## Design principles

1. **Functions are pure and tested.** Both functions are deterministic `input -> output` transforms with zero I/O, which makes them trivially unit-testable: the business logic has **100% branch coverage** with Vitest (`npm test`). If your discount logic isn't tested, it isn't logic — it's a liability on Black Friday.
2. **Configuration lives in metafields, not code.** Discount tiers (`$app:volume-discount` namespace) and drop limits are merchant-editable data. Changing "10% at 5 units" to "12% at 6" is not a deploy.
3. **Checkout UI extensions degrade gracefully.** The size-assist extension renders nothing when the metafield is absent — checkout never breaks because content is missing.
4. **Everything is CI-gated.** GitHub Actions runs lint + tests on every push; a function that doesn't pass its suite doesn't ship.

## Repository layout

```
shopify.app.toml                     app configuration (extension-only app)
extensions/
  volume-discount-function/          Product Discount Function (JS)
    src/run.js                       tier logic (pure)
    src/run.graphql                  input query (cart lines, shop metafield)
    tests/run.test.js                Vitest suite — tiers, caps, edge cases
  drop-limit-validation/             Cart & Checkout Validation Function (JS)
    src/run.js                       per-product limits for tagged "drop" items
    src/run.graphql
    tests/run.test.js
  size-assist-checkout-ui/           Checkout UI extension (React)
    src/Checkout.jsx                 size guidance banner + delivery note
docs/architecture.md                 data-flow diagrams (mermaid)
.github/workflows/ci.yml             lint + vitest on push/PR
```

## Getting started

```bash
npm install
npm test                      # vitest — function logic suites

# Deploy to a dev store (Shopify CLI ≥ 3.x, Plus or dev-preview store)
shopify app dev
```

### Configure volume discounts (merchant-side)

Set the shop metafield `$app:volume-discount.tiers` (JSON):

```json
[
  { "minQuantity": 5,  "percentage": 10 },
  { "minQuantity": 10, "percentage": 15 },
  { "minQuantity": 25, "percentage": 20 }
]
```

Only products tagged `team-eligible` participate. The function picks the highest
tier matching the **total eligible quantity across the cart** (so 3 jerseys + 2
shorts still unlock the 5+ tier — that's how team managers actually buy).

### Configure drop limits

Tag the product `limited-drop` and set product metafield
`$app:drop-limit.max_per_order` (integer). The validation function blocks
checkout with a clear, localisable message when exceeded.

## Testing philosophy

See [`tests/run.test.js`](extensions/volume-discount-function/tests/run.test.js): the suites cover
no-op carts, threshold boundaries (4 vs 5 units), tier selection, mixed
eligible/ineligible lines, malformed metafield config (function must fail
*open* — no discount — never crash checkout), and discount targeting.

## License

MIT — use it, learn from it, fork it.
