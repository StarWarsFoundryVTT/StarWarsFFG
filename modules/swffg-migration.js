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

  for (const actor of game.actors) {
    const xpLog = actor.getFlag("starwarsffg", "xpLog") || [];
    const updatedLog = [];
    const purchaseRegex = new RegExp("<b>(.*?)</b>: (.*?) <b>(.*?)</b>.*<b>(.*?)</b> \\((.*?) available, (.*?) total");
    const grantRegex = new RegExp("<b>(.*?)</b>: (\\w*) granted <b>(.*?)</b>.*: (.*?) \\((.*?) available, (.*?) total");

    for (const entry of xpLog) {
      if (typeof entry === 'string') {
        const parsedEntry = entry.match(purchaseRegex);
        if (parsedEntry && parsedEntry.length === 7) {
          // normal spend
          updatedLog.push({
            action: parsedEntry[2].replace('spent', 'purchased'),
            id: undefined,
            xp: {
              cost: parsedEntry[3],
              available: parsedEntry[5],
              total: parsedEntry[6],
            },
            date: parsedEntry[1],
            description: parsedEntry[4],
          });
        } else {
          // "<font color=\"green\"><b>2024-08-08</b>: Self granted <b>50</b> XP, reason: manual grant (50 available, 0 total)</font>"
          // "<font color=\"green\"><b>2025-07-09</b>: GM granted <b>5</b> XP, reason: feel like it, bubs (175 available, 110 total)</font>"
          const parsedEntry = entry.match(grantRegex);
          if (parsedEntry && parsedEntry.length === 7) {
            updatedLog.push({
              action: parsedEntry[2].replace('GM', 'granted').replace('Self', 'adjusted'),
              id: undefined,
              xp: {
                cost: parsedEntry[3],
                available: parsedEntry[5],
                total: parsedEntry[6],
              },
              date: parsedEntry[1],
              description: parsedEntry[4],
            });
          }
        }
      }
    }
    actor.setFlag("starwarsffg", "xpLog", updatedLog);
  }
  // iterate over actors to update their stats
  for (const actor of game.actors) {
    // record the initial stats so we can subtract them out later
    let inputStats = {
      system: {},
    };

    // collect the initial stats
    if (["character", "nemesis", "rival"].includes(actor.type)) {
      // characteristics
      inputStats.system.characteristics = {};
      for (const characteristic in actor.system.characteristics) {
        inputStats.system.characteristics[characteristic] = {
          value: actor.system.characteristics[characteristic].value,
        }
      }
      // wounds, soak, strain, defense, encumbrance
      inputStats.system.stats = {
        wounds: foundry.utils.deepClone(actor.system.stats.wounds),
        soak: foundry.utils.deepClone(actor.system.stats.soak),
        defence: foundry.utils.deepClone(actor.system.stats.defence),
        encumbrance: foundry.utils.deepClone(actor.system.stats.encumbrance),
      };
      if (actor.type !== "rival") {
        inputStats.system.stats.strain =  foundry.utils.deepClone(actor.system.stats.strain);
      }
      // skills
      inputStats.system.skills = foundry.utils.deepClone(actor.system.skills);
    }

    for (const item of actor.items) {
      // trigger modifier AEs to be created
      const itemData = actor.items.get(item.id).toJSON();
      itemData.data = itemData.system;
      delete itemData.flags;

      // trigger inherent AEs to be created
      await item._onCreateAEs({parent: true}, true);
      await ModifierHelpers.applyActiveEffectOnUpdate(item, itemData);
    }

    const updatedStats = game.actors.get(actor.id);
    const finalStats = foundry.utils.deepClone(inputStats);

    if (["character", "nemesis", "rival"].includes(actor.type)) {
      // characteristics
      for (const characteristic in actor.system.characteristics) {
        finalStats.system.characteristics[characteristic].value = updatedStats.system.characteristics[characteristic].value - ((updatedStats.system.characteristics[characteristic].value - foundry.utils.deepClone(inputStats.system.characteristics[characteristic].value)) * 2);
      }
      // wounds
      finalStats.system.stats.wounds.max = updatedStats.system.stats.wounds.max - ((updatedStats.system.stats.wounds.max - inputStats.system.stats.wounds.max) * 2);
      // strain
      if (actor.type !== "rival") {
        finalStats.system.stats.strain.max = updatedStats.system.stats.strain.max - ((updatedStats.system.stats.strain.max - inputStats.system.stats.strain.max) * 2);
      }
      // soak
      finalStats.system.stats.soak.value = Math.max(updatedStats.system.stats.soak.value - ((updatedStats.system.stats.soak.value - inputStats.system.stats.soak.value) * 2), 0);
      // defense
      finalStats.system.stats.defence.melee = updatedStats.system.stats.defence.melee - ((updatedStats.system.stats.defence.melee - inputStats.system.stats.defence.melee) * 2);
      finalStats.system.stats.defence.ranged = updatedStats.system.stats.defence.ranged - ((updatedStats.system.stats.defence.ranged - inputStats.system.stats.defence.ranged) * 2);
      // encumbrance
      finalStats.system.stats.encumbrance.max = updatedStats.system.stats.encumbrance.max - ((updatedStats.system.stats.encumbrance.max - inputStats.system.stats.encumbrance.max) * 2);

      // skills
      for (const skill in actor.system.skills) {
        finalStats.system.skills[skill].rank = updatedStats.system.skills[skill].rank - ((updatedStats.system.skills[skill].rank - foundry.utils.deepClone(inputStats.system.skills[skill].rank)) * 2);
      }

      await updatedStats.update({system: finalStats.system});
      // certain changes get clobbered if done in this single update, so split them out
      await updatedStats.update({"system.stats.soak.value": finalStats.system.stats.soak.value});
      await updatedStats.update({"system.stats.wounds.max": finalStats.system.stats.wounds.max});
      if (actor.type !== "rival") {
        await updatedStats.update({"system.stats.strain.max": finalStats.system.stats.strain.max});
      }
    }
  }

  // now that the stats have been updated, create AEs for remaining speciality items
  // I'm not sure why, but making changes in the same loop results in duplication bugs
  for (const actor of game.actors) {
    for (const item of actor.items) {
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
