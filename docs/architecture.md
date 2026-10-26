# Architecture & data flow

## Volume discount (Product Discount Function)

```mermaid
flowchart LR
    M[Merchant edits shop metafield\n$app:volume-discount.tiers] -->|JSON tiers| F
    C[Cart changes] --> I[Function input\nrun.graphql]
    I --> F[run.js\npure transform]
    F -->|tier matched| D[Percentage discount\non eligible lines]
    F -->|no tier / bad config| N[No discount\nfail open]
```

Key properties:

- **Pure:** `run(input)` has no I/O; the same input always yields the same output. This is what makes the 100%-coverage test suite possible.
- **Cross-line quantity:** the tier is selected on the sum of eligible quantities in the whole cart — matching how team managers buy assortments.
- **Fail open:** malformed tier JSON → no discount, never an exception. Shopify disables repeatedly-crashing functions; failing open keeps checkout healthy.

## Drop limit (Cart & Checkout Validation Function)

```mermaid
flowchart LR
    P[Product tagged limited-drop\n+ metafield max_per_order] --> I[Function input]
    C[Checkout attempt] --> I
    I --> V[run.js]
    V -->|qty <= limit| OK[Checkout proceeds]
    V -->|qty > limit| E[Blocking error\nper offending line]
```

Why a Function and not theme JS: theme-level limits are cosmetic — the cart API
ignores them. A validation function is enforced server-side on **every** path
into checkout (storefront, direct cart links, headless clients).

## Size assist (Checkout UI extension)

```mermaid
flowchart LR
    MF[Product metafield\ncustom.size_note] --> X[Checkout.jsx]
    X --> B[Info banner at checkout\nreduces size-driven returns]
    X --> A[Checkbox -> order attribute\n'Delivery note']
    A --> O[Order payload read by 3PL]
```

Design choices:

- Extension declares exactly one metafield (`custom.size_note`) — checkout UI
  extensions receive only declared metafields, least-privilege by construction.
- No `network_access`, no `api_access`, `block_progress = false`: the extension
  can inform but can never slow down or break checkout.
- Attribute write is optimistic with rollback on error.
