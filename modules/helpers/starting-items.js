/**
 * Starting gear on a species or career: links to weapons, armor, and gear
 */
export const STARTING_ITEM_TYPES = ["weapon", "armour", "gear"];

/**
 * The stored link to a dropped item.
 */
export function startingItemEntry(item) {
  return { name: item.name, type: item.type, source: item.uuid };
}

/**
 * The entries for display
 */
export function prepareStartingItems(entries) {
  const prepared = {};
  for (const [key, entry] of Object.entries(entries ?? {})) {
    const linked = fromUuidSync(entry.source);
    prepared[key] = { ...entry, name: linked?.name ?? entry.name, broken: !linked };
  }
  return prepared;
}

/**
 * Give the actor holding a species or career its own copy of each linked item
 */
export async function grantStartingItems(parent) {
  const toCreate = [];
  const missing = [];
  for (const entry of Object.values(parent.system.startingItems ?? {})) {
    const linked = await fromUuid(entry.source);
    if (!linked) {
      missing.push(entry.name);
      continue;
    }
    const data = linked.toObject();
    delete data._id;
    foundry.utils.setProperty(data, "flags.starwarsffg.grantedBy", parent.id);
    toCreate.push(data);
  }
  if (missing.length > 0) {
    const names = { parent: parent.name, items: missing.join(", ") };
    ui.notifications.warn(game.i18n.format("SWFFG.StartingItems.Missing", names));
  }
  if (toCreate.length > 0) await parent.actor.createEmbeddedDocuments("Item", toCreate);
}

/**
 * Ask whether to remove the items a deleted species or career granted
 */
export async function offerStartingItemRemoval(parent) {
  const actor = parent.actor;
  const granted = actor.items.filter((i) => i.getFlag("starwarsffg", "grantedBy") === parent.id);
  if (granted.length === 0) return;
  const body = game.i18n.format("SWFFG.StartingItems.RemovePrompt.Body", {
    parent: Handlebars.escapeExpression(parent.name),
    actor: Handlebars.escapeExpression(actor.name),
  });
  const list = granted.map((i) => `<li>${Handlebars.escapeExpression(i.name)}</li>`).join("");
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("SWFFG.StartingItems.RemovePrompt.Title") },
    content: `<p>${body}</p><ul>${list}</ul>`,
  });
  if (!confirmed) return;
  await actor.deleteEmbeddedDocuments("Item", granted.map((i) => i.id));
}
