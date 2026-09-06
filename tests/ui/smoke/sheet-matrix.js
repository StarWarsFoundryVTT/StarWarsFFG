/**
 * The document types and sheets the smoke matrix covers.
 *
 * Listed rather than read from template.json at runtime, so adding a type to the system without
 * adding it here shows up as a failing count assertion instead of quietly going untested.
 */

/** Actor.types from template.json. */
export const ACTOR_TYPES = ['character', 'minion', 'vehicle', 'homestead', 'rival', 'nemesis'];

/** Item.types from template.json. */
export const ITEM_TYPES = [
  'ability', 'armour', 'career', 'criticaldamage', 'criticalinjury', 'forcepower', 'gear',
  'itemattachment', 'itemmodifier', 'talent', 'shipattachment', 'shipweapon', 'homesteadupgrade',
  'signatureability', 'specialization', 'species', 'weapon', 'background', 'obligation', 'motivation',
];

/**
 * Sheets registered in swffg-main.js. Ids are `${scope}.${className}`.
 *
 * Both variants are covered because the non-default one is where this breaks: #1950 and #1761
 * were each "the sheet that isn't the default won't open", which nothing would catch if the
 * matrix only ever rendered whatever `makeDefault` happens to point at.
 */
export const ACTOR_SHEETS = [
  { id: 'ffg.ActorSheetFFG', label: 'Actor Sheet v1', types: ACTOR_TYPES },
  { id: 'ffg.ActorSheetFFGV2', label: 'Actor Sheet v2', types: ACTOR_TYPES },
  { id: 'ffg.AdversarySheetFFG', label: 'Adversary Sheet v1', types: ['character'] },
  { id: 'ffg.AdversarySheetFFGV2', label: 'Adversary Sheet v2', types: ['character'] },
];

export const ITEM_SHEETS = [
  { id: 'ffg.ItemSheetFFG', label: 'Item Sheet v1', types: ITEM_TYPES },
  { id: 'ffg.ItemSheetFFGV2', label: 'Item Sheet v2', types: ITEM_TYPES },
];

/** Flatten a sheet list into [type, sheet] pairs. */
export const combinations = (sheets) =>
  sheets.flatMap((sheet) => sheet.types.map((type) => ({ type, sheet })));

export const ACTOR_CASES = combinations(ACTOR_SHEETS);   // 14
export const ITEM_CASES = combinations(ITEM_SHEETS);     // 40
