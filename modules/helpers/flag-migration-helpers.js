export default class FlagMigrationHelpers {
  // Old scopes used in prior versions that need to be cleaned up
  static oldFlagScopes = [
    "ffg",
    "ffgTempId",
    "ffgUuid",
    "ffgParent",
    "ffgimportid",
    "config", // Actor sheet settings
    "importid", // Doesn't appear to be read anymore but still exists
  ];

  // Clean up flags for all document types
  static migrateFlags() {
    this.rescopeActorFlags();
    this.rescopeItemFlags();
    this.rescopePackFlags();
  }

  // Loop all items
  // and copy old flags into new scope
  static rescopeItemFlags() {
    for (let doc of game.items) {
      for (let flag in doc.system.flags) {
        this.rescopeFlag(doc, flag);
      }
    }
  }

  // Actors
  static rescopeActorFlags() {
    for (let doc of game.actors) {
      for (let flag in doc.system.flags) {
        this.rescopeFlag(doc, flag);
      }
    }
  }

  // Packs
  static rescopePackFlags() {
    for (let pack of game.packs) {
      this.handlePack(pack);
    }
  }

  /**
   * Apply migration rules to all Documents within a single Compendium pack
   * Shamelessly stolen and adapted from dnd5e
   * @param {CompendiumCollection} pack  Pack to be migrated.
   * @returns {Promise}
   *
   */
  static handlePack = async function (pack) {
    const documentName = pack.documentName;
    if (!["Actor", "Item"].includes(documentName)) return;

    // Unlock the pack for editing
    const wasLocked = pack.locked;
    await pack.configure({ locked: false });

    // Get the contents
    const documents = await pack.getDocuments();

    // Iterate over compendium entries
    for (let doc of documents) {
      try {
        switch (documentName) {
          case "Actor":
          case "Item":
            for (let flag in doc.system.flags) {
              this.rescopeFlag(doc, flag);
            }
        }

        await doc.update();
        console.debug(
          `Migrated ${documentName} document ${doc.name} in Compendium ${pack.collection}`
        );
      } catch (err) {
        // Handle migration failures
        err.message = `Failed migration for document ${doc.name} in pack ${pack.collection}: ${err.message}`;
        console.error(err);
      }
    }

    // Apply the original locked status for the pack
    await pack.configure({ locked: wasLocked });
    console.log(
      `Migrated all ${documentName} documents from Compendium ${pack.collection}`
    );
  };

  // Copy individual flag into system ('starwarsffg') scope
  static rescopeFlag(doc, flag) {
    if (this.oldFlagScopes.includes(flag)) {
      try {
        doc.setFlag("starwarsffg", flag, doc.system.flags[flag]);
        console.debug(
          `Copied flag into starwarsffg scope: ${doc.name}.system.flags.${flag}`
        );
      } catch (err) {
        console.log(`Flag migration error at document: ${doc.name}`);
        console.log(err);
      }
    }
  }
}
