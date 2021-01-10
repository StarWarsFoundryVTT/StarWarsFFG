export default class EmbeddedItemHelpers {
  static async updateRealObject(item, data) {
    let flags = item.data.flags;
    let realItem = await game.items.get(flags.ffgTempId);
    let parents = [];

    if (realItem) {
      parents.unshift(flags);
    } else {
      if (Object.values(data).length > 0) {
        parents.unshift(flags);
      }
      let x = flags?.ffgParent;
      parents.unshift(x);
      let ffgTempId = "";
      while (x) {
        if (Object.values(x.ffgParent).length > 0) {
          parents.unshift(x.ffgParent);
          x = x.ffgParent;
        } else {
          flags = x;
          ffgTempId = x.ffgTempId;
          x = undefined;
        }
      }

      realItem = await game.items.get(ffgTempId);
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

      const mergedData = { ...item.data.data, ...data.data };
      data.data = mergedData;
      const itemData = { ...item.data, ...data };

      if (item.data.flags.ffgTempItemIndex > -1) {
        dataPointer.data[item.data.flags.ffgTempItemType][item.data.flags.ffgTempItemIndex] = { ...itemData, flags: {} };
      } else {
        item.data.flags.ffgTempItemIndex = dataPointer.data[item.data.flags.ffgTempItemType].length;
        dataPointer.data[item.data.flags.ffgTempItemType].push({ ...itemData, flags: {} });
      }

      let formData = {};
      setProperty(formData, `data.${parents[0].ffgTempItemType}`, realItem.data.data[parents[0].ffgTempItemType]);

      item.data = itemData;

      realItem.update(formData);
    }
    return;
  }
}
