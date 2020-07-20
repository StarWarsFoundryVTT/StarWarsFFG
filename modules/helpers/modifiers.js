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
      const attrsToApply = Object.keys(item.data.attributes)
        .filter((id) => item.data.attributes[id].mod === key)
        .map((i) => item.data.attributes[i]);

      if (attrsToApply.length > 0) {
        attrsToApply.forEach((attr) => {
          total += parseInt(attr.value, 10);
        });
      }
    });

    return total;
  }
}
