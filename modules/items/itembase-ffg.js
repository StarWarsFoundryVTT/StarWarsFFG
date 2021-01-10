import EmbeddedItemHelpers from "../helpers/embeddeditem-helpers.js";

export default class ItemBaseFFG extends Item {
  async update(data, options = {}) {
    if (!this.data?.flags?.ffgTempId) {
      return super.update(data, options);
    } else {
      await EmbeddedItemHelpers.updateRealObject(this, data);
      this.sheet.render(true);
      // let flags = this.data.flags;

      // let realItem = await game.items.get(flags.ffgTempId);
      // let parents = [];

      // if(realItem) {
      //   parents.push(flags)
      // } else {
      //   let x = flags?.ffgParent

      //   parents.push(x);

      //   let ffgTempId = "";
      //   while(x) {
      //     if(Object.values(x.ffgParent).length > 0) {
      //       parents.push(x.ffgParent);
      //       x = x.ffgParent;
      //     } else {
      //       flags = x;
      //       ffgTempId = x.ffgTempId;
      //       x = undefined;
      //     }
      //   }

      //   realItem = await game.items.get(ffgTempId);
      // }

      // if (realItem) {
      //   if (!this.data._id) {
      //     data._id = randomID();
      //   }

      //   const mergedData = { ...this.data.data, ...data.data };
      //   data.data = mergedData;
      //   const itemData = { ...this.data, ...data };

      //   let dataPointer = realItem.data.data;

      //   parents.forEach((value, index) => {
      //     dataPointer = dataPointer[parents[index].ffgTempItemType][parents[index].ffgTempItemIndex]
      //   });

      //   if (this.data.flags.ffgTempItemIndex > -1) {
      //     dataPointer.data[this.data.flags.ffgTempItemType][this.data.flags.ffgTempItemIndex] = { ...itemData, flags: {} };
      //     //realItem.data.data[this.data.flags.ffgTempItemType][this.data.flags.ffgTempItemIndex] = { ...itemData, flags: {} };
      //   } else {
      //     this.data.flags.ffgTempItemIndex = dataPointer.data[this.data.flags.ffgTempItemType].length
      //     dataPointer.data[this.data.flags.ffgTempItemType].push({ ...itemData, flags: {} });
      //     //this.data.flags.ffgTempItemIndex = realItem.data.data[this.data.flags.ffgTempItemType].length;
      //     //realItem.data.data[this.data.flags.ffgTempItemType].push({ ...itemData, flags: {} });
      //   }

      //   let formData = {};
      //   setProperty(formData, `data.${parents[0].ffgTempItemType}`, realItem.data.data[parents[0].ffgTempItemType]);

      //   this.data = itemData;

      //   realItem.update(formData);
      //   this.sheet.render(true);
      //   return;
      // }
    }
  }
}
