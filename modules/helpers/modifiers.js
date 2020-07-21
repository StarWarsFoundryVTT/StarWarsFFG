export default class ModifierHelpers {
  /**
   * Calculate a total attribute value for a key from a list of attributes and items
   * @param  {string} key - Attribute key
   * @param  {object} attrs - Attributes object
   * @param  {array} items - Items array
   * @returns {number} - Total value of all attribute values
   */
  static getCalculateValueForAttribute(key, attrs, items) {
    let total = 0;

    total += attrs[key].value;

    items.forEach((item) => {
      if (item.type === "specialization") {
        // special handling for specializations as we need to parse the object and all learned talents.
      } else {
        const attrsToApply = Object.keys(item.data.attributes)
          .filter((id) => item.data.attributes[id].mod === key)
          .map((i) => item.data.attributes[i]);

        if (attrsToApply.length > 0) {
          attrsToApply.forEach((attr) => {
            total += parseInt(attr.value, 10);
          });
        }
      }
    });

    return total;
  }

  /**
   * Calculate total value from embedded items
   * @param  {array} items
   * @param  {string} key
   */
  static getCalculatedValueFromItems(items, key) {
    let total = 0;

    items.forEach((item) => {
      const attrsToApply = Object.keys(item.data.attributes)
        .filter((id) => item.data.attributes[id].mod === key)
        .map((i) => item.data.attributes[i]);

      if (item.type === "armour" || item.type === "weapon") {
        if (item?.data?.equippable?.equipped) {
          if (key === "Soak" && item.data?.soak) {
            total += parseInt(item.data.soak.value, 10);
          }
          if ((key === "Defence-Melee" || key === "Defence-Ranged") && item.data?.defence) {
            // get the highest defense item
            const shouldUse = actorData.items.filter((i) => item.data.defence >= i.data.defence).length >= 0;
            if (shouldUse) {
              total += parseInt(item.data.defence.value, 10);
            }
          }
          if (attrsToApply.length > 0) {
            attrsToApply.forEach((attr) => {
              total += parseInt(attr.value, 10);
            });
          }
        }
      } else if (item.type === "specialization") {
        const talents = Object.keys(item.data.talents).map((key) => item.data.talents[key]);
        console.log(talents);
      } else {
        if (attrsToApply.length > 0) {
          attrsToApply.forEach((attr) => {
            total += parseInt(attr.value, 10);
          });
        }
      }
    });

    return total;
  }

  static async onClickAttributeControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const attrs = this.object.data.data.attributes;
    const form = this.form;

    // Add new attribute
    if (action === "create") {
      const nk = new Date().getTime();
      let newKey = document.createElement("div");
      newKey.innerHTML = `<input type="text" name="data.attributes.attr${nk}.key" value="attr${nk}" style="display:none;"/><select class="attribute-modtype" name="data.attributes.attr${nk}.modtype"><option value="Characteristic">Characteristic</option></select><input class="attribute-value" type="text" name="data.attributes.attr${nk}.value" value="0" data-dtype="Number" placeholder="0"/>`;
      form.appendChild(newKey);
      await this._onSubmit(event);
    }

    // Remove existing attribute
    else if (action === "delete") {
      const li = a.closest(".attribute");
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
    }
  }
}
