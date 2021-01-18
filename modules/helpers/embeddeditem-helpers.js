import PopoutEditor from "../popout-editor.js";
import JournalEntryFFG from "../items/journalentry-ffg.js";

export default class EmbeddedItemHelpers {
  static async updateRealObject(item, data) {
    let flags = item.data.flags;
    let realItem = await game.items.get(flags.ffgTempId);
    let parents = [];
    let owner;
    let entity;

    if (realItem) {
      parents.unshift(flags);
    } else {
      if (Object.values(data).length > 0) {
        parents.unshift(flags);
      }
      let x = flags?.ffgParent;
      if (flags?.ffgParent && !flags?.ffgParent?.isCompendium) {
        parents.unshift(x);
      }

      let ffgTempId = "";
      while (x) {
        if (x?.ffgParent && Object.values(x.ffgParent).length > 0) {
          parents.unshift(x.ffgParent);
          x = x.ffgParent;
        } else {
          flags = x;
          ffgTempId = x.ffgTempId;
          x = undefined;
        }
      }

      if (flags.ffgUuid) {
        const parts = flags.ffgUuid.split(".");
        const [entityName, entityId, embeddedName, embeddedId] = parts;
        entity = entityName;
        if (entityName === "Compendium") {
          realItem = await fromUuid(flags.ffgUuid);
        } else {
          owner = CONFIG[entityName].entityClass.collection.get(entityId);
          realItem = await owner.getOwnedItem(embeddedId);
        }
      } else {
        realItem = await game.items.get(ffgTempId);
      }
    }

    if (realItem) {
      if (!item.data._id) {
        data._id = randomID();
      }

      let dataPointer = realItem.data;

      if ((Object.values(data).length === 0 || parents.length > 1) && !entity) {
        parents.forEach((value, index) => {
          dataPointer = dataPointer.data[parents[index].ffgTempItemType][parents[index].ffgTempItemIndex];
        });
      }

      const mergedData = mergeObject(item.data.data, data.data);
      data.data = mergedData;
      const itemData = mergeObject(item.data, data);

      if (item.data.flags.ffgTempItemIndex > -1) {
        dataPointer.data[item.data.flags.ffgTempItemType][item.data.flags.ffgTempItemIndex] = { ...itemData, flags: {} };
      } else {
        item.data.flags.ffgTempItemIndex = dataPointer.data[item.data.flags.ffgTempItemType].length;
        dataPointer.data[item.data.flags.ffgTempItemType].push({ ...itemData, flags: {} });
      }

      let formData = {};
      setProperty(formData, `data.${parents[0].ffgTempItemType}`, realItem.data.data[parents[0].ffgTempItemType]);

      item.data = itemData;

      // because this could be a temporary item, item-ffg.js may not fire, we need to set the renderedDesc.
      if (item.data.data.renderedDesc) {
        item.data.data.renderedDesc = PopoutEditor.renderDiceImages(item.data.data.description, {});
      }

      if (realItem?.compendium) {
        formData._id = realItem._id;
        realItem.update(formData);
        realItem.render(false, { action: "update", data: formData });
      } else {
        await realItem.update(formData);
      }
    }
    return;
  }

  /**
   * Displays Owned Item, Item Modifier as a journal entry
   *
   * @param  {string} itemId - Owned Item Id
   * @param  {string} modifierType - Item Modifier Type (itemattachment/itemmodifier)
   * @param  {string} modifierId - Item Modifier Id
   * @param  {string} actorId = Actor Id
   */
  static async displayOwnedItemItemModifiersAsJournal(itemId, modifierType, modifierId, actorId) {
    try {
      const actor = await game.actors.get(actorId);
      const ownedItem = await actor.getOwnedItem(itemId);

      if (!ownedItem) ui.notifications.warn(`The item had been removed or can not be found!`);

      let modifierIndex;
      let item;
      if (ownedItem?.data?.data?.[modifierType]) {
        modifierIndex = ownedItem.data.data[modifierType].findIndex((i) => i._id === modifierId);
        item = ownedItem.data.data[modifierType][modifierIndex];
      }

      if (!item) {
        // this is a modifier on an attachment
        ownedItem.data.data.itemattachment.forEach((a) => {
          modifierIndex = a.data[modifierType].findIndex((m) => m._id === modifierId);
          if (modifierIndex > -1) {
            item = a.data[modifierType][modifierIndex];
          }
        });
      }

      const readonlyItem = {
        name: item.name,
        content: item.data.description,
      };

      const readonlyItemJournalEntry = new JournalEntryFFG(readonlyItem, { temporary: true });
      readonlyItemJournalEntry.sheet.render(true);
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
      ownedItem = await parent.getOwnedItem(itemId);
    } else {
      ownedItem = await game.items.get(itemId);
    }

    let modifierIndex;
    if (!isNaN(modifierId)) {
      modifierIndex = modifierId;
    } else {
      modifierIndex = ownedItem.data.data[modifierType].findIndex((i) => i._id === modifierId);
    }

    let item;
    if (ownedItem?.data?.data?.[modifierType]) {
      item = ownedItem.data.data[modifierType][modifierIndex];
    }

    if (!item) {
      // this is a modifier on an attachment
      ownedItem.data.data.itemattachment.forEach((a) => {
        if (!isNaN(modifierId)) {
          modifierIndex = modifierId;
        } else {
          modifierIndex = a.data[modifierType].findIndex((m) => m._id === modifierId);
        }
        if (modifierIndex > -1) {
          item = a.data[modifierType][modifierIndex];
        }
      });
    }

    const temp = {
      ...item,
      flags: {
        ffgTempId: itemId,
        ffgTempItemType: modifierType,
        ffgTempItemIndex: modifierIndex,
        ffgIsTemp: true,
        ffgUuid: ownedItem.uuid,
      },
    };

    let tempItem = await Item.create(temp, { temporary: true });
    tempItem.data._id = temp._id;
    tempItem.data.flags.readonly = true;
    if (!temp._id) {
      tempItem.data._id = randomID();
    }
    tempItem.sheet.render(true);
  }
}
