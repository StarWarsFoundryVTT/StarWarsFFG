export default class ItemBaseFFG extends Item {
  constructor(...args) {
    super(...args);

    this.items = this.items || [];
  }

  /** @override */
  prepareEmbeddedEntities() {
    this.items = this._prepareAssociatedItems(this.data.items || []);
  }

  _prepareAssociatedItems(items) {
    const prior = this.items;
    const c = new Collection();
    for (let i of items) {
      let item = null;

      // Prepare item data
      try {
        if (prior && prior.has(i._id)) {
          item = prior.get(i._id);
          item._data = i;
          item.prepareData();
        } else item = Item.createOwned(i, this);
        c.set(i._id, item);
      } catch (err) {
        // Handle preparation failures gracefully
        err.message = `Owned Item preparation failed for ${item.id} (${item.name}) in Item ${this.id} (${this.name})`;
        console.error(err);
      }
    }
    return c;
  }
}
