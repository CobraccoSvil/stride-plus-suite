import {
  reactExtension,
  Banner,
  BlockStack,
  Checkbox,
  Text,
  useApi,
  useApplyAttributeChange,
  useCartLines,
} from '@shopify/ui-extensions-react/checkout';
import { useState } from 'react';

/**
 * Size Assist — checkout UI extension.
 *
 * Two conversion-oriented features, both metafield/attribute driven:
 *
 * 1. Size guidance banner: if any cart line's product carries the
 *    `custom.size_note` metafield (e.g. "Runs small — size up for a relaxed
 *    fit"), show it at checkout. Catching a size doubt *before* payment is
 *    cheaper than a return. Renders nothing when no metafield is present —
 *    the extension can never break checkout by missing content.
 *
 * 2. "Leave package with concierge" checkbox -> order attribute the 3PL
 *    reads from the order payload. No app backend required.
 *
 * Metafield access is declared in shopify.extension.toml
 * ([extensions.metafields]) — checkout UI extensions only receive
 * explicitly requested metafields.
 */
export default reactExtension('purchase.checkout.block.render', () => <SizeAssist />);

function SizeAssist() {
  const { i18n } = useApi();
  const lines = useCartLines();
  const applyAttributeChange = useApplyAttributeChange();
  const [concierge, setConcierge] = useState(false);

  // Collect distinct size notes across cart lines (deduped: two variants of
  // the same tee must not produce two banners).
  const sizeNotes = [
    ...new Set(
      lines
        .map(
          (line) =>
            line.merchandise?.product?.metafields?.find(
              (m) => m?.namespace === 'custom' && m?.key === 'size_note'
            )?.value
        )
        .filter(Boolean)
    ),
  ];

  async function onConciergeChange(checked) {
    setConcierge(checked);
    const result = await applyAttributeChange({
      type: 'updateAttribute',
      key: 'Delivery note',
      value: checked ? 'Leave with concierge if absent' : '',
    });
    if (result.type === 'error') {
      // Revert optimistic UI on failure; never leave state lying about the order.
      setConcierge(!checked);
    }
  }

  return (
    <BlockStack spacing="base">
      {sizeNotes.map((note) => (
        <Banner key={note} status="info" title={i18n.translate('sizeNoteTitle')}>
          <Text>{note}</Text>
        </Banner>
      ))}

      <Checkbox checked={concierge} onChange={onConciergeChange}>
        {i18n.translate('conciergeLabel')}
      </Checkbox>
    </BlockStack>
  );
}
