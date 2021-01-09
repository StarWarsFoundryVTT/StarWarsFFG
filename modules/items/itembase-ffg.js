export default class ItemBaseFFG extends Item {
  async update(data, options = {}) {
    if (!this.data?.flags?.ffgTempId) {
      return super.update(data, options);
    } else {
      const realItem = await game.items.get(this.data.flags.ffgTempId);

      if (realItem) {
        if (!this.data._id) {
          data._id = randomID();
        }

        const mergedData = { ...this.data.data, ...data.data };
        data.data = mergedData;
        const itemData = { ...this.data, ...data };

        if (this.data.flags.ffgTempItemIndex > -1) {
          realItem.data.data[this.data.flags.ffgTempItemType][this.data.flags.ffgTempItemIndex] = { ...itemData, flags: {} };
        } else {
          this.data.flags.ffgTempItemIndex = realItem.data.data[this.data.flags.ffgTempItemType].length;
          realItem.data.data[this.data.flags.ffgTempItemType].push({ ...itemData, flags: {} });
        }

        let formData = {};
        setProperty(formData, `data.${this.data.flags.ffgTempItemType}`, realItem.data.data[this.data.flags.ffgTempItemType]);

        this.data = itemData;

        realItem.update(formData);
        this.sheet.render(true);
        return;
      }
    }
  }
}
