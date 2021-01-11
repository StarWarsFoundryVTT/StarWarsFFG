export default class EmbeddedItemHelpers {
  static async updateRealObject(item, data) {
    let flags = item.data.flags;
    let realItem = await game.items.get(flags.ffgTempId);
    let parents = [];
    let owner;

    if (realItem) {
      parents.unshift(flags);
    } else {
      if (Object.values(data).length > 0) {
        parents.unshift(flags);
      }
      let x = flags?.ffgParent;
      if (flags?.ffgParent) {
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

        owner = CONFIG[entityName].entityClass.collection.get(entityId);
        realItem = await owner.getOwnedItem(embeddedId);
      } else {
        realItem = await game.items.get(ffgTempId);
      }
    }

    if (realItem) {
      if (!item.data._id) {
        data._id = randomID();
      }

      let dataPointer = realItem.data;

      if (Object.values(data).length === 0 || parents.length > 1) {
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

      await realItem.update(formData);
    }
    return;
  }
}
