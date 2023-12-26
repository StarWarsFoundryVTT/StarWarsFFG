import PopoutEditor from "../popout-editor.js";
import ItemHelpers from "./item-helpers.js";

export default class EmbeddedItemHelpers {

  /**
   * Actually grabs both the real item and the flag Hierarchy
   * @param temporaryItem - the item which data will be merged into (the attachment, in our test case)
   * @returns {Promise<*>}
   */
  static async _getRealItem(temporaryItem) {
    // NOTE: If data is no-op update, there was previous logic here to not populate parents. We think that's dead, but leaving a note to be removed before commit in case that turned out to be important.
    // https://github.com/StarWarsFoundryVTT/StarWarsFFG/blob/3721dd62caeb7b18e3b9907dfb5ec0342e4dd3ac/modules/helpers/embeddeditem-helpers.js#L14-L16

    // NOTE: Previously, only add the ffgParent from flags to parents if NOT in the compendium. Don't think we want or need that anymore.
    // https://github.com/StarWarsFoundryVTT/StarWarsFFG/blob/3721dd62caeb7b18e3b9907dfb5ec0342e4dd3ac/modules/helpers/embeddeditem-helpers.js#L17-L20

    let flags = temporaryItem.flags.starwarsffg;
    let flagHierarchy = [flags];
    if (!flags.ffgParent) {
      if (flags.ffgUuid) {
        flagHierarchy = [flags];
      }
      // TODO: We think this code path is dead, but being paranoid for now. Should clean-up later.
      //ui.notifications.warn("We think this code path is dead, let us know that it's not! (flag does not have parent)");
      //CONFIG.logger.error("Flags does not have parent assigned");
    }
    while (flags.ffgParent) {
      if (Object.values(flags.ffgParent).length === 0) {
        // TODO: We think this code path is dead, but being paranoid for now. Should clean-up later.
        ui.notifications.warn("We think this code path is dead, let us know that it's not! (parent is empty)");
        CONFIG.logger.error("FFG parent is empty");
      }
      flags = flags.ffgParent.starwarsffg;
      flagHierarchy.unshift(flags);
    }
    CONFIG.logger.debug("After flagHierarchy population", flagHierarchy);

    if (!flags.ffgTempId && !flags.ffgUuid) {
      ui.notifications.error("Unable to find parent ffgTempId or ffgUuid, aborting action");
      throw new Error("Unable to find parent ffgTempId or ffgUuid");
    }

    // TODO: we do not currently resolve items within compendiums
    let realItem;
    if (Object.keys(flags).includes('ffgUuid') && flags.ffgUuid != null) {
      realItem = await fromUuid(flags.ffgUuid);
    } else {
      realItem = await game.items.get(flags.ffgTempId);
    }
    CONFIG.logger.debug("Real item", realItem);

    return {
      realItem,
      flagHierarchy,
    };
  }

  static async updateRealObject(temporaryItem, data) {
    // TODO: drop parents once the refactor is done
    const {realItem, flagHierarchy: parents} = await EmbeddedItemHelpers._getRealItem(temporaryItem);
    // this code was mostly written by Phind
    // removing a key from a dict in Foundry requires submitting it with a new key of `-=key` and a value of null
    // without explicitly replacing values, we end up duplicating entries instead of removing the one
    // so instead, we go and manually remove any mods which have been deleted

    // find any deleted attributes
    const deleted_keys = EmbeddedItemHelpers.findKeysIncludingStringRecursively(
        data,
        '-=attr',
    );
    // remove matching attributes from the existing object
    deleted_keys.forEach(function (cur_key) {
      cur_key = cur_key.substring(2);
      EmbeddedItemHelpers.removeKeyFromObject(
          temporaryItem,
          cur_key,
      );
      EmbeddedItemHelpers.removeKeyFromObject(
          realItem,
          cur_key,
      );
    });
    // this is the end of the de-duplicating -=key stuff

    if (!realItem) {
      ui.notifications.error("Could not locate the real item, aborting action");
      CONFIG.logger.error("Could not locate the real item, aborting action");
      return;
    }

    // TODO: we don't check for actors or compendiums here, either (and we may need to)
    let dataPointer = realItem;
    CONFIG.logger.debug("Starting dataPointer", dataPointer);
    parents.forEach((flags) => {
      if (flags.ffgTempItemType && flags.ffgTempItemIndex) {
        CONFIG.logger.debug(`Traversing into ${flags.ffgTempItemType} #${flags.ffgTempItemIndex}`);
        dataPointer = dataPointer.system[flags.ffgTempItemType][flags.ffgTempItemIndex];
      }
    });
    CONFIG.logger.debug("Final dataPointer", dataPointer);
    await mergeObject(
        temporaryItem,
        ItemHelpers.normalizeDataStructure(data),
        {
          recursive: true,
          insertKeys: true,
          insertValues: true,
        },
    );

    mergeObject(dataPointer, {...temporaryItem, ...ItemHelpers.normalizeDataStructure(data)});
    mergeObject(dataPointer.flags, temporaryItem.flags);

    let formData = {
      system: {
        [temporaryItem.flags.starwarsffg.ffgTempItemType]: realItem.system[temporaryItem.flags.starwarsffg.ffgTempItemType]
      },
    };

    // because this could be a temporary item, item-ffg.js may not fire, we need to set the renderedDesc.
    if (temporaryItem.system.renderedDesc) {
      temporaryItem.system.renderedDesc = PopoutEditor.renderDiceImages(
          temporaryItem.system.description,
          {},
      );
    }
    CONFIG.logger.debug("Final formData", formData);
    await realItem.update(formData);
  }

  /**
   * Displays Owned Item, Item Modifier as a journal entry
   *
   * @param  {string} itemId - Owned Item Id
   * @param  {string} modifierType - Item Modifier Type (itemattachment/itemmodifier)
   * @param  {string} modifierId - Item Modifier Id
   * @param  {string} actorId = Actor Id
   */
  static async displayOwnedItemItemModifiersAsJournal(itemId, modifierType, modifierId, actorId, compendium) {
    try {
      let actor;

      if (compendium) {
        actor = await compendium.get(actorId);
      } else {
        actor = await game.actors.get(actorId);
      }
      const ownedItem = await actor.items.get(itemId);

      if (!ownedItem) ui.notifications.warn(`The item had been removed or can not be found!`);

      let modifierIndex;
      let item;
      if (ownedItem?.system[modifierType]) {
        modifierIndex = ownedItem.system[modifierType].findIndex((i) => i?._id === modifierId || i?.id === modifierId);
        item = ownedItem.system[modifierType][modifierIndex];
      }

      if (!item) {
        // this is a modifier on an attachment
        ownedItem.system.itemattachment.forEach((a) => {
          modifierIndex = a.system[modifierType].findIndex((m) => m.id === modifierId);
          if (modifierIndex > -1) {
            item = a.data[modifierType][modifierIndex];
          }
        });
      }

      const readonlyItem = {
        name: item.name,
        pages: [{
          name: item.name,
          type: 'text',
          text: {
            content: item.system.description,
            format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML
          },
        }],
        ownership: {
          default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
        },
      };

      let readonlyItemJournalEntry = await JournalEntry.create(readonlyItem, {temporary: true});
      readonlyItemJournalEntry.sheet.render(true)
    } catch (err) {
      ui.notifications.warn(`The item or quality has been removed or can not be found!`);
      CONFIG.logger.warn(`Error loading Read-Only Journal Item`, err);
    }
  }

  static async loadItemModifierSheet(itemId, modifierType, modifierId, actorId) {
    let parent;
    let ownedItem;

    if (actorId) {
      parent = await game.actors.get(actorId);
      ownedItem = await parent.items.get(itemId);
    } else {
      ownedItem = await game.items.get(itemId);
    }

    let modifierIndex;
    if (!isNaN(modifierId)) {
      modifierIndex = modifierId;
    } else {
      modifierIndex = ownedItem.data.data[modifierType].findIndex((i) => i.id === modifierId);
    }

    let item;
    if (ownedItem?.data?.data?.[modifierType]) {
      item = ownedItem.data.data[modifierType][modifierIndex];
    }

    if (!item) {
      // this is a modifier on an attachment
      ownedItem.data.data.itemattachment.forEach((a) => {
        if (!isNaN(modifierId)) {
          modifierIndex = modifierId - ownedItem.data.data[modifierType].length;
        } else {
          modifierIndex = a.data[modifierType].findIndex((m) => m.id === parseInt(modifierId, 10) - ownedItem.data.data[modifierType].length);
        }
        if (modifierIndex > -1) {
          item = a.data[modifierType][modifierIndex];
        }
      });
    }

    const temp = {
      ...item,
      flags: {
        starwarsffg: {
          ffgTempId: itemId,
          ffgTempItemType: modifierType,
          ffgTempItemIndex: modifierIndex,
          ffgIsTemp: true,
          ffgUuid: ownedItem.uuid,
        }
      },
    };

    let tempItem = await Item.create(temp, {temporary: true});
    tempItem.data._id = temp.id;
    await tempItem.setFlag("starwarsffg", "readonly", true);
    if (!temp.id) {
      tempItem.data._id = randomID();
    }
    tempItem.sheet.render(true);
  }

  static async createNewEmbeddedItem(type, data, flags) {
    let temp = {
      img: "icons/svg/mystery-man.svg",
      name: "",
      type,
      flags: {
        starwarsffg: {
          ffgTempItemType: type,
          ffgTempItemIndex: -1,
          ...flags,
        }
      },
      data,
    };

    let tempItem = await Item.create(temp, {temporary: true});

    tempItem.data._id = temp.id;
    if (!temp.id) {
      tempItem.data._id = randomID();
    }

    return tempItem;
  }

  // totally not ripped from phind telling me how to do this
  static removeKeyFromObject(obj, keyToRemove) {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (key === keyToRemove) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          EmbeddedItemHelpers.removeKeyFromObject(obj[key], keyToRemove);
        }
      }
    }
  }

  // totally not ripped from phind telling me how to do this
  static findKeysIncludingStringRecursively(obj, str) {
    let keys = [];
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (key.includes(str)) {
          keys.push(key);
        }
        if (typeof obj[key] === 'object') {
          keys = keys.concat(EmbeddedItemHelpers.findKeysIncludingStringRecursively(obj[key], str));
        }
      }
    }
    return keys;
  }
}
