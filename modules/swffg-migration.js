import ModifierHelpers from "./helpers/modifiers.js";

/**
 * Handles all logic related to migrating the system to a new version, including sending notifications
 * @returns {Promise<void>}
 */
export async function handleUpdate() {
  const registeredVersion = game.settings.get("starwarsffg", "systemMigrationVersion");
  const runningVersion = game.system.version;
  if (registeredVersion !== runningVersion) {
    await handleMigration(registeredVersion, runningVersion);
    await sendChanges(runningVersion);
    await game.settings.set("starwarsffg", "systemMigrationVersion", runningVersion);
  }
}

/**
 * Handles migration logic for the system
 * @param oldVersion - version previously run (from the settings)
 * @param newVersion - version currently running (from game.system.version)
 * @returns {Promise<void>}
 */
async function handleMigration(oldVersion, newVersion) {
  // migration handlers should be added here going forward
  if (parseFloat(oldVersion) < 1.901) {
    await migrateTo1_901();
  }
  if (parseFloat(oldVersion) < 1.906) {
    await migrateTo1_906();
  }
  if (parseFloat(oldVersion) < 1.907) {
    await migrateToUnknown();
  }
  await warnTheme();
}

/**
 * Sends a notification to all users in the game that the system has been updated
 * @param newVersion - version currently running (from game.system.version)
 * @returns {Promise<void>}
 */
async function sendChanges(newVersion) {
  const template = "systems/starwarsffg/templates/notifications/new_version.html";
  const html = await renderTemplate(template, { version: newVersion });
  const messageData = {
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    content: html,
  };
  ChatMessage.create(messageData);
}

/**
 * Notify users if they are using the now-retired theme
 * @returns {Promise<void>}
 */
async function warnTheme() {
  if (game.settings.get("starwarsffg", "ui-uitheme") === "default") {
    const messageData = {
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: "You are using an unsupported theme. Expected issues, or swap to the Mandar theme.<br>(This message will only show once.)",
    };
    ChatMessage.create(messageData);
  }
}

/**
 * Handles updating talents from species on actors to be a "species" talent rather than the default type
 * @returns {Promise<void>}
 */
async function migrateTo1_901() {
  for (const actor of game.actors) {
    for (const species of actor.items.filter(a => a.type === "species")) {
      for (const talent of Object.values(species.system.talents)) {
        await actor.items.find(i => i.name === talent.name)?.update({flags: {starwarsffg: {fromSpecies: true}}});
      }
    }
  }
}

/**
 * Updates settings pointing to system compendiums to instead point to world-level compendiums
 * @returns {Promise<void>}
 */
async function migrateTo1_906() {
  // specializations
  let compendiums = [];
  for (const compendium of game.settings.get("starwarsffg", "specializationCompendiums").split(",")) {
    if (compendium.includes("starwarsffg.")) {
      compendiums.push(compendium.replace("starwarsffg.", "world."));
    } else {
      compendiums.push(compendium);
    }
  }
  game.settings.set("starwarsffg", "specializationCompendiums", compendiums.join(","));
  // signature abilities
  compendiums = [];
  for (const compendium of game.settings.get("starwarsffg", "signatureAbilityCompendiums").split(",")) {
    if (compendium.includes("starwarsffg.")) {
      compendiums.push(compendium.replace("starwarsffg.", "world."));
    } else {
      compendiums.push(compendium);
    }
  }
  game.settings.set("starwarsffg", "signatureAbilityCompendiums", compendiums.join(","));
  // force powers
  compendiums = [];
  for (const compendium of game.settings.get("starwarsffg", "forcePowerCompendiums").split(",")) {
    if (compendium.includes("starwarsffg.")) {
      compendiums.push(compendium.replace("starwarsffg.", "world."));
    } else {
      compendiums.push(compendium);
    }
  }
  game.settings.set("starwarsffg", "forcePowerCompendiums", compendiums.join(","));
  // talents
  compendiums = [];
  for (const compendium of game.settings.get("starwarsffg", "talentCompendiums").split(",")) {
    if (compendium.includes("starwarsffg.")) {
      compendiums.push(compendium.replace("starwarsffg.", "world."));
    } else {
      compendiums.push(compendium);
    }
  }
  game.settings.set("starwarsffg", "talentCompendiums", compendiums.join(","));
}

/**
 * Creates Active Effects on all relevant items and reduces actor stats to account for this
 * @returns {Promise<void>}
 */
async function migrateToUnknown() {

  // iterate over actors to update their stats
  for (const actor of game.actors) {
    // record the initial stats so we can subtract them out later
    let initialStats = {
      system: {},
    };

    // collect the initial stats
    if (["character", "nemesis", "rival"].includes(actor.type)) {
      // characteristics
      initialStats.system.characteristics = {};
      for (const characteristic in actor.system.characteristics) {
        initialStats.system.characteristics[characteristic] = {
          value: actor.system.characteristics[characteristic].value,
        }
      }
      // wounds, soak, strain, defense, encumbrance
      initialStats.system.stats = {
        wounds: foundry.utils.deepClone(actor.system.stats.wounds),
        soak: foundry.utils.deepClone(actor.system.stats.soak),
        defence: foundry.utils.deepClone(actor.system.stats.defence),
        encumbrance: foundry.utils.deepClone(actor.system.stats.encumbrance),
      };
      if (actor.type !== "rival") {
        initialStats.system.stats.strain =  foundry.utils.deepClone(actor.system.stats.strain);
      }
      // skills
      initialStats.system.skills = foundry.utils.deepClone(actor.system.skills);
    }

    for (const item of actor.items) {
      // trigger modifier AEs to be created
      const itemData = actor.items.get(item.id).toJSON();
      itemData.data = itemData.system;
      delete itemData.flags;

      await ModifierHelpers.applyActiveEffectOnUpdate(item, itemData);
    }

    const updatedStats = game.actors.get(actor.id);

    if (["character", "nemesis", "rival"].includes(actor.type)) {
      // characteristics
      for (const characteristic in actor.system.characteristics) {
        initialStats.system.characteristics[characteristic].value = updatedStats.system.characteristics[characteristic].value - ((updatedStats.system.characteristics[characteristic].value - foundry.utils.deepClone(initialStats.system.characteristics[characteristic].value)) * 2);
      }
      // wounds
      initialStats.system.stats.wounds.max = updatedStats.system.stats.wounds.max - ((updatedStats.system.stats.wounds.max - initialStats.system.stats.wounds.max) * 2);
      // strain
      if (actor.type !== "rival") {
        initialStats.system.stats.strain.max = updatedStats.system.stats.strain.max - ((updatedStats.system.stats.strain.max - initialStats.system.stats.strain.max) * 2);
      }
      // soak
      initialStats.system.stats.soak.value = updatedStats.system.stats.soak.value - ((updatedStats.system.stats.soak.value - initialStats.system.stats.soak.value) * 2);
      // defense
      initialStats.system.stats.defence.melee = updatedStats.system.stats.defence.melee - ((updatedStats.system.stats.defence.melee - initialStats.system.stats.defence.melee) * 2);
      initialStats.system.stats.defence.ranged = updatedStats.system.stats.defence.ranged - ((updatedStats.system.stats.defence.ranged - initialStats.system.stats.defence.ranged) * 2);
      // encumbrance
      initialStats.system.stats.encumbrance.max = updatedStats.system.stats.encumbrance.max - ((updatedStats.system.stats.encumbrance.max - initialStats.system.stats.encumbrance.max) * 2);

      // skills
      for (const skill in actor.system.skills) {
        initialStats.system.skills[skill].rank = updatedStats.system.skills[skill].rank - ((updatedStats.system.skills[skill].rank - initialStats.system.skills[skill].rank) * 2);
      }

      await updatedStats.update({system: initialStats.system});
    }
  }

  // now that the stats have been updated, create AEs for remaining speciality items
  // I'm not sure why, but making changes in the same loop results in duplication bugs
  for (const actor of game.actors) {
    for (const item of actor.items) {
      // trigger inherent AEs to be created
      await item._onCreateAEs({parent: true});
      // rename any mods using the old naming scheme and create active effects for them
      if (item.type === "specialization") {
        const toCreate = [];
        for (let i=0; i < 20; i++) {
          const attributes = item.system.talents[`talent${i}`].attributes;
          if (Object.keys(attributes).length > 0) {
            for (const attribute in attributes) {
              if (!attribute.startsWith("attr")) {
                // the attribute is using an older form, update it to the new naming scheme
                const nk = `attr${new Date().getTime()}`;
                item.system.talents[`talent${i}`].attributes[nk] = attributes[attribute];
                item.system.talents[`talent${i}`].attributes[`-=${attribute}`] = null;
                delete item.system.talents[`talent${i}`].attributes[attribute];
                // ensure further keys have a new entry
                await new Promise(r => setTimeout(r, 1));

                const explodedMods = ModifierHelpers.explodeMod(
                  item.system.talents[`talent${i}`].attributes[nk].modtype,
                  item.system.talents[`talent${i}`].attributes[nk].mod
                );
                const changes = [];
                for (const curMod of explodedMods) {
                  changes.push({
                    key: ModifierHelpers.getModKeyPath(curMod['modType'], curMod['mod']),
                    mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                    value: item.system.talents[`talent${i}`].attributes[nk].value,
                  });
                }
                // add an active effect with the changes we've just built, synced to the learned state
                toCreate.push({
                  name: nk,
                  changes: changes,
                  disabled: !item.system.talents[`talent${i}`].islearned,
                });
              }
            }
          }
        }
        await item.update({"system.talents": item.system.talents});
        if (toCreate.length > 0) {
          await item.createEmbeddedDocuments("ActiveEffect", toCreate);
        }
      } else if (item.type === "forcepower") {
        const toCreate = [];
        for (let i=0; i < 16; i++) {
          const attributes = item.system.upgrades[`upgrade${i}`].attributes;
          if (Object.keys(attributes).length > 0) {
            for (const attribute in attributes) {
              if (!attribute.startsWith("attr")) {
                // the attribute is using an older form, update it to the new naming scheme
                const nk = `attr${new Date().getTime()}`;
                item.system.upgrades[`upgrade${i}`].attributes[nk] = attributes[attribute];
                item.system.upgrades[`upgrade${i}`].attributes[`-=${attribute}`] = null;
                delete item.system.upgrades[`upgrade${i}`].attributes[attribute];
                // ensure further keys have a new entry
                await new Promise(r => setTimeout(r, 1));

                const explodedMods = ModifierHelpers.explodeMod(
                  item.system.upgrades[`upgrade${i}`].attributes[nk].modtype,
                  item.system.upgrades[`upgrade${i}`].attributes[nk].mod
                );
                const changes = [];
                for (const curMod of explodedMods) {
                  changes.push({
                    key: ModifierHelpers.getModKeyPath(curMod['modType'], curMod['mod']),
                    mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                    value: item.system.upgrades[`upgrade${i}`].attributes[nk].value,
                  });
                }
                // add an active effect with the changes we've just built, synced to the learned state
                toCreate.push({
                  name: nk,
                  changes: changes,
                  disabled: !item.system.upgrades[`upgrade${i}`].islearned,
                });
              }
            }
          }
        }
        await item.update({"system.upgrades": item.system.upgrades});

        if (toCreate.length > 0) {
          await item.createEmbeddedDocuments("ActiveEffect", toCreate);
        }
      } else if (item.type === "signatureability") {
        const toCreate = [];

        for (let i=0; i < 8; i++) {
          const attributes = item.system.upgrades[`upgrade${i}`].attributes;
          if (Object.keys(attributes).length > 0) {
            for (const attribute in attributes) {
              if (!attribute.startsWith("attr")) {
                // the attribute is using an older form, update it to the new naming scheme
                const nk = `attr${new Date().getTime()}`;
                item.system.upgrades[`upgrade${i}`].attributes[nk] = attributes[attribute];
                item.system.upgrades[`upgrade${i}`].attributes[`-=${attribute}`] = null;
                delete item.system.upgrades[`upgrade${i}`].attributes[attribute];
                // ensure further keys have a new entry
                await new Promise(r => setTimeout(r, 1));

                const explodedMods = ModifierHelpers.explodeMod(
                  item.system.upgrades[`upgrade${i}`].attributes[nk].modtype,
                  item.system.upgrades[`upgrade${i}`].attributes[nk].mod
                );
                const changes = [];
                for (const curMod of explodedMods) {
                  changes.push({
                    key: ModifierHelpers.getModKeyPath(curMod['modType'], curMod['mod']),
                    mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                    value: item.system.upgrades[`upgrade${i}`].attributes[nk].value,
                  });
                }
                // add an active effect with the changes we've just built, synced to the learned state
                toCreate.push({
                  name: nk,
                  changes: changes,
                  disabled: !item.system.upgrades[`upgrade${i}`].islearned,
                });
              }
            }
          }
        }
        await item.update({"system.upgrades": item.system.upgrades});

        if (toCreate.length > 0) {
          await item.createEmbeddedDocuments("ActiveEffect", toCreate);
        }
      }
    }
  }


  // handle items
  for (const item of game.items) {
    // trigger inherent AEs to be created
    await item._onCreateAEs({parent: false});
    // trigger modifier AEs to be created
    const itemData = item.toJSON();
    itemData.data = itemData.system;
    await ModifierHelpers.applyActiveEffectOnUpdate(item, itemData);
  }
}
