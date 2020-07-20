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
}
