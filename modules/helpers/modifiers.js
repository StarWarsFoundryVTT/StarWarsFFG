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

    if (key === "Shields") {
      total += this.getCalculatedValueFromItems(items, key, modtype);

      return attrs[key].value.map((v) => v + total);
    } else {
      const attrValue = attrs[key].value;
      const itemsValue = this.getCalculatedValueFromItems(items, key, modtype);

      total += attrValue;
      total += itemsValue;
    }

    return total;
  }

  /**
   * Calculate total value from embedded items
   * @param  {array} items
   * @param  {string} key
   */
  static getCalculatedValueFromItems(items, key, modtype, includeSource) {
    let total = 0;
    let checked = false;
    let sources = [];

    try {
      items.forEach((item) => {
        if (!item) {
          // don't process null items
          return;
        }
        if (item.system?.attributes) {
          const attrsToApply = Object.keys(item.system.attributes)
            .filter((id) => (item.system.attributes[id].mod === key || item.system.attributes[id].mod === "*") && item.system.attributes[id].modtype === modtype)
            .map((i) => item.system.attributes[i]);
          if (item.type === "armour" || item.type === "weapon") {
            if (item?.system?.equippable?.equipped) {
              if (item.system?.itemmodifier) {
                total += this.getCalculatedValueFromItems(item.system.itemmodifier, key, "Stat");
              }
              if (key === "Soak" && item.system?.soak) {
                sources.push({ modtype, key, name: item.name, value: item.system.soak.adjusted, type: item.type });
                total += parseInt(item.system.soak.adjusted, 10);
              }
              if ((key === "Defence-Melee" || key === "Defence-Ranged") && item.system?.defence) {
                // get the highest defense item
                const shouldUse = items.filter((i) => item.system.defence >= i.system.defence).length >= 0;
                if (shouldUse) {
                  sources.push({ modtype, key, name: item.name, value: item.system.defence.adjusted, type: item.type });
                  total += parseInt(item.system.defence.adjusted, 10);
                }
              }
              if (attrsToApply.length > 0) {
                attrsToApply.forEach((attr) => {
                  if (modtype === "Career Skill" || modtype === "Force Boost") {
                    if (attr.value) {
                      sources.push({ modtype, key, name: item.name, value: true, type: item.type });
                      checked = true;
                    }
                  } else {
                    sources.push({ modtype, key, name: item.name, value: attr.value, type: item.type });
                    total += parseInt(attr.value, 10);
                  }
                });
              }
            }
          } else if (item.type === "forcepower" || item.type === "specialization" || item.type === "signatureability") {
            // apply basic force power/specialization modifiers
            if (attrsToApply.length > 0) {
              attrsToApply.forEach((attr) => {
                if (modtype === "Career Skill" || modtype === "Force Boost") {
                  if (attr.value) {
                    sources.push({ modtype, key, name: item.name, value: true, type: item.type });
                    checked = true;
                  }
                } else {
                  if ((modtype === "ForcePool" && total === 0) || modtype !== "ForcePool") {
                    sources.push({ modtype, key, name: item.name, value: attr.value, type: item.type });
                    total += parseInt(attr.value, 10);
                  }
                }
              });
            }
            let upgrades;
            if (item.type === "forcepower" || item.type === "signatureability") {
              // apply force power upgrades
              upgrades = Object.keys(item.system.upgrades)
                .filter((k) => item.system.upgrades[k].islearned)
                .map((k) => {
                  return {
                    type: "talent",
                    name: `${item.name}: ${item.system.upgrades[k].name}`,
                    data: {
                      attributes: item.system.upgrades[k]?.attributes ? item.system.upgrades[k]?.attributes : {},
                      ranks: {
                        ranked: false,
                        current: 1,
                      },
                    },
                  };
                });
            } else if (item.type === "specialization") {
              // apply specialization talent modifiers
              upgrades = Object.keys(item.system.talents)
                .filter((k) => item.system.talents[k].islearned)
                .map((k) => {
                  return {
                    type: "talent",
                    name: `${item.name}: ${item.system.talents[k].name}`,
                    system: {
                      attributes: item.system.talents[k].attributes,
                      ranks: {
                        ranked: item.system.talents[k].isRanked,
                        current: 1,
                      },
                    },
                  };
                });
            }
            if (modtype === "Career Skill" || modtype === "Force Boost") {
              if (this.getCalculatedValueFromItems(upgrades, key, modtype)) {
                sources.push({ modtype, key, name: item.name, value: true, type: item.type });
                checked = true;
              }
            } else {
              if (includeSource) {
                const subValues = this.getCalculatedValueFromItems(upgrades, key, modtype, includeSource);
                total += subValues.total;
                sources = sources.concat(subValues.sources);
              } else {
                const subValues = this.getCalculatedValueFromItems(upgrades, key, modtype);
                total += subValues;
              }
            }
          } else {
            if (attrsToApply.length > 0) {
              attrsToApply.forEach((attr) => {
                if (modtype === "Career Skill" || modtype === "Force Boost") {
                  if (attr.value) {
                    sources.push({ modtype, key, name: item.name, value: true, type: item.type });
                    checked = true;
                  }
                } else {
                  if (item.type === "talent") {
                    let multiplier = 1;
                    if (item.system.ranks.ranked) {
                      multiplier = item.system.ranks.current;
                    }
                    sources.push({ modtype, key, name: item.name, value: attr.value * multiplier, type: item.type });
                    total += parseInt(attr.value, 10) * multiplier;
                  } else {
                    const quantity = (isNaN(item.system?.quantity?.value)) ? 1 : item.system.quantity.value;
                    sources.push({ modtype, key, name: item.name, value: attr.value, type: item.type });
                    total += parseInt(attr.value, 10) * quantity;
                  }
                }
              });
            }
          }
        }
      });
    } catch (err) {
      CONFIG.logger.warn(`Error occured while trying to calculate modifiers from item list`, err);
    }

    if (modtype === "Career Skill" || modtype === "Force Boost") {
      if (includeSource) {
        return { checked, sources };
      }
      return checked;
    }

    if (includeSource) {
      return { total, sources };
    } else {
      return total;
    }
  }

  static getCalculatedValueFromCurrentAndArray(item, items, key, modtype, includeSource) {
    let total = 0;
    let checked = false;
    let sources = [];

    let rank = item?.system?.rank;
    if(rank === null || rank === undefined) {
      rank = 1;
    }
    if (item?.system) {
      const filteredAttributes = Object.values(item.system.attributes).filter((a) => a.modtype === modtype && a.mod === key);

      filteredAttributes.forEach((attr) => {
        sources.push({ modtype, key, name: item.name, value: attr.value * rank, type: item.type });
        total += parseInt(attr.value * rank, 10);
      });
    }

    const itemsTotal = ModifierHelpers.getCalculatedValueFromItems(items, key, modtype, includeSource);
    if (includeSource) {
      total += itemsTotal.total;
      sources = sources.concat(itemsTotal.sources);

      return { total, sources };
    } else {
      total += itemsTotal;
      return total;
    }
  }

  static getBaseValue(items, key, modtype) {
    let total = 0;

    items.forEach((item) => {
      if (item.type === "species") {
        const attrsToApply = Object.keys(item.system.attributes)
          .filter((id) => item.system.attributes[id].mod === key && item.system.attributes[id].modtype === modtype)
          .map((i) => item.system.attributes[i]);

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
    const form = this.form;

    // Add new attribute
    if (action === "create") {
      const nk = new Date().getTime();
      let newKey = document.createElement("div");
      if (["criticaldamage", "shipattachment", "shipweapon"].includes(this.object.type)) {
        newKey.innerHTML = `<input type="text" name="data.attributes.attr${nk}.key" value="attr${nk}" style="display:none;"/><select class="attribute-modtype" name="data.attributes.attr${nk}.modtype"><option value="Stat">Stat</option></select><input class="attribute-value" type="text" name="data.attributes.attr${nk}.value" value="0" data-dtype="Number" placeholder="0"/>`;
      } else if (["itemmodifier", "itemattachment"].includes(this.object.type)) {
        newKey.innerHTML = `<input type="text" name="data.attributes.attr${nk}.key" value="attr${nk}" style="display:none;"/><select class="attribute-modtype" name="data.attributes.attr${nk}.modtype"><option value="Roll Modifiers">Stat</option></select><input class="attribute-value" type="text" name="data.attributes.attr${nk}.value" value="0" data-dtype="Number" placeholder="0"/>`;
      } else {
        newKey.innerHTML = `<input type="text" name="data.attributes.attr${nk}.key" value="attr${nk}" style="display:none;"/><select class="attribute-modtype" name="data.attributes.attr${nk}.modtype"><option value="Characteristic">Characteristic</option></select><input class="attribute-value" type="text" name="data.attributes.attr${nk}.value" value="0" data-dtype="Number" placeholder="0"/>`;
      }
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

    const title = `${game.i18n.localize("SWFFG.TabModifiers")}: ${this.object.system.upgrades[keyname].name}`;

    const data = {
      parent: this.object,
      keyname,
      data: {
        data: {
          ...this.object.system.upgrades[keyname],
        },
      },
      isUpgrade: true,
    };

    new PopoutModifiers(data, {
      title,
    }).render(true);
  }

  static async popoutModiferWindowSpecTalents(event) {
    event.preventDefault();
    const a = $(event.currentTarget).parents(".talent-block")?.[0];
    const keyname = $(a).attr("id");

    const title = `${game.i18n.localize("SWFFG.TabModifiers")}: ${this.object.system.talents[keyname].name}`;

    const data = {
      parent: this.object,
      keyname,
      data: {
        data: {
          ...this.object.system.talents[keyname],
        },
      },
      isUpgrade: false,
      isTalent: true,
    };

    new PopoutModifiers(data, {
      title,
    }).render(true);
  }

  static async getDicePoolModifiers(pool, item, items) {
    let dicePool = new DicePoolFFG(pool);

    dicePool.boost += ModifierHelpers.getCalculatedValueFromCurrentAndArray(item, items, "Add Boost", "Roll Modifiers");
    dicePool.setback += ModifierHelpers.getCalculatedValueFromCurrentAndArray(item, items, "Add Setback", "Roll Modifiers");
    dicePool.remsetback += ModifierHelpers.getCalculatedValueFromCurrentAndArray(item, items, "Remove Setback", "Roll Modifiers");
    dicePool.advantage += ModifierHelpers.getCalculatedValueFromCurrentAndArray(item, items, "Add Advantage", "Result Modifiers");
    dicePool.dark += ModifierHelpers.getCalculatedValueFromCurrentAndArray(item, items, "Add Dark", "Result Modifiers");
    dicePool.failure += ModifierHelpers.getCalculatedValueFromCurrentAndArray(item, items, "Add Failure", "Result Modifiers");
    dicePool.light += ModifierHelpers.getCalculatedValueFromCurrentAndArray(item, items, "Add Light", "Result Modifiers");
    dicePool.success += ModifierHelpers.getCalculatedValueFromCurrentAndArray(item, items, "Add Success", "Result Modifiers");
    dicePool.threat += ModifierHelpers.getCalculatedValueFromCurrentAndArray(item, items, "Add Threat", "Result Modifiers");
    dicePool.triumph += ModifierHelpers.getCalculatedValueFromCurrentAndArray(item, items, "Add Triumph", "Result Modifiers");
    dicePool.despair += ModifierHelpers.getCalculatedValueFromCurrentAndArray(item, items, "Add Despair", "Result Modifiers");

    dicePool.difficulty += ModifierHelpers.getCalculatedValueFromCurrentAndArray(item, items, "Add Difficulty", "Dice Modifiers");
    dicePool.upgradeDifficulty(ModifierHelpers.getCalculatedValueFromCurrentAndArray(item, items, "Upgrade Difficulty", "Dice Modifiers"));
    dicePool.upgradeDifficulty(-1 * ModifierHelpers.getCalculatedValueFromCurrentAndArray(item, items, "Downgrade Difficulty", "Dice Modifiers"));
    dicePool.upgrade(ModifierHelpers.getCalculatedValueFromCurrentAndArray(item, items, "Upgrade Ability", "Dice Modifiers"));
    dicePool.upgrade(-1 * ModifierHelpers.getCalculatedValueFromCurrentAndArray(item, items, "Downgrade Ability", "Dice Modifiers"));

    return dicePool;
  }

  static applyBrawnToDamage(data) {
    if(data.characteristic?.value !== "" && data.characteristic?.value !== undefined) {
      return true;
    }

    return false;
  }
}
