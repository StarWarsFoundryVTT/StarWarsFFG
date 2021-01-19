/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export default class JournalEntryFFG extends JournalEntry {
  /** @override */
  static get config() {
    return {
      baseEntity: JournalEntry,
      collection: game.journal,
      embeddedEntities: {},
      label: "ENTITY.JournalEntry",
      permissions: {
        create: "TEMPLATE_CREATE",
      },
    };
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["sheet", "journal-sheet"],
      width: 720,
      height: 800,
      resizable: true,
      closeOnSubmit: false,
      submitOnClose: true,
      viewPermission: ENTITY_PERMISSIONS.OBSERVER,
    });
  }

  async update(data, options = {}) {
    return;
  }
}
