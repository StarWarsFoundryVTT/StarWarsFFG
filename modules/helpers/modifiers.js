import PopoutModifiers from "../popout-modifiers.js";

export default class ModifierHelpers {
  /**
   * Calculate a total attribute value for a key from a list of attributes and items
   * @param  {string} key - Attribute key
   * @param  {object} attrs - Attributes object
   * @param  {array} items - Items array
   * @returns {number} - Total value of all attribute values
   */
  static getCalculateValueForAttribute(key, attrs, items, modtype) {
    let total = 0;

    total += attrs[key].value;

    total += this.getCalculatedValueFromItems(items, key, modtype);
    return total;
  }

  /**
   * Calculate total value from embedded items
   * @param  {array} items
   * @param  {string} key
   */
  static getCalculatedValueFromItems(items, key, modtype) {
    let total = 0;
    let checked = false;

    items.forEach((item) => {
      const attrsToApply = Object.keys(item.data.attributes)
        .filter((id) => item.data.attributes[id].mod === key && item.data.attributes[id].modtype === modtype)
        .map((i) => item.data.attributes[i]);

      if (item.type === "armour" || item.type === "weapon") {
        if (item?.data?.equippable?.equipped) {
          if (key === "Soak" && item.data?.soak) {
            total += parseInt(item.data.soak.value, 10);
          }
          if ((key === "Defence-Melee" || key === "Defence-Ranged") && item.data?.defence) {
            // get the highest defense item
            const shouldUse = items.filter((i) => item.data.defence >= i.data.defence).length >= 0;
            if (shouldUse) {
              total += parseInt(item.data.defence.value, 10);
            }
          }
          if (attrsToApply.length > 0) {
            attrsToApply.forEach((attr) => {
              if (modtype === "Career Skill" || modtype === "Force Boost") {
                if (attr.value) {
                  checked = true;
                }
              } else {
                total += parseInt(attr.value, 10);
              }
            });
          }
        }
      } else if (item.type === "forcepower" || item.type === "specialization") {
        // apply basic force power/specialization modifiers
        if (attrsToApply.length > 0) {
          attrsToApply.forEach((attr) => {
            if (modtype === "Career Skill" || modtype === "Force Boost") {
              if (attr.value) {
                checked = true;
              }
            } else {
              if (modtype === "ForcePool" && total === 0) {
                total += parseInt(attr.value, 10);
              }
            }
          });
        }
        let upgrades;
        if (item.type === "forcepower") {
          // apply force power upgrades
          upgrades = Object.keys(item.data.upgrades)
            .filter((k) => item.data.upgrades[k].islearned)
            .map((k) => {
              return {
                type: "talent",
                data: {
                  attributes: item.data.upgrades[k]?.attributes ? item.data.upgrades[k]?.attributes : {},
                  ranks: {
                    ranked: false,
                    current: 1,
                  },
                },
              };
            });
        } else if (item.type === "specialization") {
          // apply specialization talent modifiers
          upgrades = Object.keys(item.data.talents)
            .filter((k) => item.data.talents[k].islearned)
            .map((k) => {
              return {
                type: "talent",
                data: {
                  attributes: item.data.talents[k].attributes,
                  ranks: {
                    ranked: item.data.talents[k].isRanked,
                    current: 1,
                  },
                },
              };
            });
        }
        if (modtype === "Career Skill" || modtype === "Force Boost") {
          if (this.getCalculatedValueFromItems(upgrades, key, modtype)) {
            checked = true;
          }
        } else {
          total += this.getCalculatedValueFromItems(upgrades, key, modtype);
        }
      } else {
        if (attrsToApply.length > 0) {
          attrsToApply.forEach((attr) => {
            if (modtype === "Career Skill" || modtype === "Force Boost") {
              if (attr.value) {
                checked = true;
              }
            } else {
              if (item.type === "talent") {
                let multiplier = 1;
                if (item.data.ranks.ranked) {
                  multiplier = item.data.ranks.current;
                }
                total += parseInt(attr.value, 10) * multiplier;
              } else {
                total += parseInt(attr.value, 10);
              }
            }
          });
        }
      }
    });
    if (modtype === "Career Skill" || modtype === "Force Boost") {
      return checked;
    }
    return total;
  }

  static getBaseValue(items, key, modtype) {
    let total = 0;

    items.forEach((item) => {
      if (item.type === "species") {
        const attrsToApply = Object.keys(item.data.attributes)
          .filter((id) => item.data.attributes[id].mod === key && item.data.attributes[id].modtype === modtype)
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
   * DOM event
   * @param  {object} event
   */
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

  /**
   * Create popout Modifiers Window
   * @param  {object} event
   */
  static async popoutModiferWindow(event) {
    event.preventDefault();
    const a = event.currentTarget.parentElement;

    const title = `${game.i18n.localize("SWFFG.TabModifiers")}: ${this.object.name}`;

    new PopoutModifiers(this.object, {
      title,
    }).render(true);
  }

  static async popoutModiferWindowUpgrade(event) {
    event.preventDefault();
    const a = event.currentTarget.parentElement;
    const keyname = a.dataset.itemid;

    const title = `${game.i18n.localize("SWFFG.TabModifiers")}: ${this.object.data.data.upgrades[keyname].name}`;

    const data = {
      parent: this.object,
      keyname,
      data: {
        data: {
          ...this.object.data.data.upgrades[keyname],
        },
      },
      isUpgrade: true,
    };

    new PopoutModifiers(data, {
      title,
    }).render(true);
  }
}
