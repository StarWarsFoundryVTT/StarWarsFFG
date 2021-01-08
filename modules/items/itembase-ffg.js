export default class ItemBaseFFG extends Item {
  async update(data, options = {}) {
    if (!this.data?.flags?.ffgTempId) {
      super.update(data, options);
    } else {
      const realItem = await game.items.get(this.data.flags.ffgTempId);

      if (realItem) {
        const mergedData = { ...this.data.data, ...data.data };
        data.data = mergedData;

        realItem.data.data[this.data.flags.ffgTempItemType][this.data.flags.ffgTempItemIndex] = { ...this.data, ...data, flags: {} };
      }

      let formData = {};
      setProperty(formData, `data.${this.data.flags.ffgTempItemType}`, realItem.data.data[this.data.flags.ffgTempItemType]);
      realItem.update(formData);
    }
  }
}
