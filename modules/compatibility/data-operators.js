/** Create a native Foundry V14 field-deletion instruction. */
export function deleteDataField() {
  return new foundry.data.operators.ForcedDeletion();
}

/** Test whether a value is a native Foundry V14 field-deletion instruction. */
export function isDataFieldDeletion(value) {
  return value instanceof foundry.data.operators.ForcedDeletion;
}
