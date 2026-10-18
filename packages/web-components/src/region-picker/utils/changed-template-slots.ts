import { SLOT_ATTRIBUTE } from '../constants/markup';

/** The `slot` names of the templates the records added or removed. */
export function changedTemplateSlots(records: readonly MutationRecord[]): ReadonlySet<string> {
  const slots: Set<string> = new Set();
  for (const record of records) {
    for (const node of [...record.addedNodes, ...record.removedNodes]) {
      if (!(node instanceof HTMLTemplateElement)) continue;
      const slot: string | null = node.getAttribute(SLOT_ATTRIBUTE);
      if (slot !== null) slots.add(slot);
    }
  }
  return slots;
}
