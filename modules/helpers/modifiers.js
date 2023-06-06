import PopoutModifiers from "../popout-modifiers.js";
import {testMap, testSkillModMap} from "../config/ffg-activeEffects.js";

export default class ModifierHelpers {

  /**
   * Replaces the old getCalculatedValueFromCurrentAndArray.
   * Used to calculate item stats based on e.g. attachments.
   * @param modifiers - a list of active modifiers
   * @param stat - the stat we want values for, e.g. "damage"
   * @param mod_type - category of modifier, e.g. "weapon stats"
   * @returns {number} - how much the included modifiers modify the mentioned stat by
   */
  static calculateValueFromModifiers(modifiers, stat, mod_type) {
    let total = 0;
    //console.log("calculating stuff")
    // the objective here is to count the total changes coming from mods
    modifiers.forEach(function (modifier) {
      if (modifier['modtype'] === mod_type && modifier['mod'] === stat && modifier['active']) {
        total += parseInt(modifier['value']);
      }
    });
    //console.log(total)
    return total;
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

      console.log("submitting data")
      await this._onSubmit(event);
      console.log("done, creating thingy")
      console.log(this.item)
      console.log(this)
      if (this.id === 'popout-modifiers') {
        if (this.object.parent.type === 'forcepower' || this.object.parent.type === 'signatureability') {
          // create the active effect after submitting the change because things go wrong in the other order
          await this.object.parent.createEmbeddedDocuments("ActiveEffect", [{
            label: `attr${nk}`,
            icon: "icons/svg/aura.svg",
            origin: this.object.uuid,
            disabled: false,
            transfer: true,
          }]);
        }
        return;
      }
      // only attempt to create AEs on non-temporary items
      if (!this.object?.getFlag('starwarsffg', 'ffgIsTemp')) {
        // check if the mod has a nonce and

        // create the active effect after submitting the change because things go wrong in the other order
        await this.item.createEmbeddedDocuments("ActiveEffect", [{
          label: `attr${nk}`,
          icon: "icons/svg/aura.svg",
          origin: this.item.uuid,
          disabled: false,
          transfer: true,
        }]);
      }
    }

    // Remove existing attribute
    else if (action === "delete") {
      const li = a.closest(".attribute");
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
      // look up the ID
      const delete_id = $(li).attr('data-attribute');
      // find the matching active effect
      const to_delete = [];
      if (this.id === 'popout-modifiers' && this.object?.parent?.type === 'forcepower' || this.object?.parent?.type === 'signatureability') {
        this.object.parent.getEmbeddedCollection("ActiveEffect").filter(i => i.label === delete_id).forEach(function (item) {
          to_delete.push(item.id);
        });
        await this.object.parent.deleteEmbeddedDocuments("ActiveEffect", to_delete);
      } else {
        this.item.getEmbeddedCollection("ActiveEffect").filter(i => i.label === delete_id).forEach(function (item) {
          to_delete.push(item.id);
        });
        await this.item.deleteEmbeddedDocuments("ActiveEffect", to_delete);
      }
    } else if (action === "activate") {

    }
  }

  /**
   * Given a "modifier type" and "modifier", determine the associated key(s)/mode for the active effect to modify
   * @param modifier_category - "modifier type" selected
   * @param modifier - "modifier" selected
   * @returns {{}} - returns an object with two keys - "keys", containing all keys to update,
   *  and "mode", containing the mode to set the active effect to
   */
  static determineModifierKey(modifier_category, modifier) {
    // TODO: these mappings should be a global location and should be auto-generated
    let skill_mods = {
      'Career Skill': 'careerskill',
      'Force Boost': 'force', // not working
      'Skill Add Advantage': 'advantage',
      'Skill Add Dark': 'dark',
      'Skill Add Despair': 'despair',
      'Skill Add Failure': 'failure',
      'Skill Add Light': 'light',
      'Skill Add Success': 'success',
      'Skill Add Threat': 'threat',
      'Skill Add Triumph': 'triumph',
      'Skill Add Upgrade': 'upgrades', // not working
      'Skill Boost': 'boost', // not working
      'Skill Rank': 'rank',
      'Skill Remove Setback': 'remsetback',
      'Skill Setback': 'setback', // not working
    };
    let stat_mods = {
      'Wounds': 'system.attributes.Wounds.value',
      'Strain': 'system.attributes.Strain.value',
      'Soak': 'system.attributes.Soak.value', // may also be adjusted
      'Defence-Melee': 'system.attributes.Defence-Melee.value',
      'Defence-Ranged': 'system.attributes.Defence-Ranged.value',
      'Encumbrance': 'system.attributes.Encumbrance.value',
      'ForcePool': 'system.attributes.ForcePool.value',
      'Armour': 'system.attributes.Armour.value',
      'Handling': 'system.attributes.Handling.value',
      'Hulltrauma': 'system.attributes.Hulltrauma.value',
      'Silhouette': 'system.attributes.Silhouette.value', // 1 --> 10 instead of +5 (6)
      'Speed': 'system.attributes.Speed.value',
      'Systemstrain': 'system.attributes.Systemstrain.value',
    };
    // TODO: add result, dice, roll mods (from e.g. attachments)
    let data = {
      keys: [],
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
    };
    console.log(`determining modifier type for ${modifier_category}`)
    if (modifier_category === 'Characteristic') {
      // Characteristic mods
      data['keys'] = [`system.attributes.${modifier}.value`];
    } else if (modifier_category === 'Skill Rank') {
      // Skill ranks
      if (modifier === '*') {
        // TODO: handle "all skills"
        // returning something so it doesn't break code and leave me in bad states
        console.log("found 'all skills' selected; using placeholder value")
        data['keys'] = [`system.attributes.Astrogation.value`];
      } else {
        data['keys'] = [`system.attributes.${modifier}.value`];
      }
    } else if (Object.keys(skill_mods).includes(modifier_category)) {
      // Skill mods
      if (modifier === '*') {
        // TODO: handle "all skills"
        // returning something so it doesn't break code and leave me in bad states
        console.log("found 'all skills' selected; using placeholder value")
        data['keys'] = [`system.skills.Astrogation.${skill_mods[modifier_category]}`];
      } else {
        data['keys'] = [`system.skills.${modifier}.${skill_mods[modifier_category]}`];
      }
      // "Career skill" sets to True/False, not modifies a number
      if (modifier_category === 'Career Skill') {
        data['mode'] = CONST.ACTIVE_EFFECT_MODES.OVERRIDE;
      }
    } else if (modifier_category === 'Stat' && Object.keys(stat_mods).includes(modifier)) {
      // Stat mods
      data['keys'] = [stat_mods[modifier]];
    } else if (modifier_category === 'Encumbrance (Current)' || modifier_category === 'Encumbrance (Equipped)') {
      data['keys'] = ['system.stats.encumbrance.value'];
    } else if (modifier_category === 'Hardpoints') {
      data['keys'] = ['system.stats.customizationHardPoints.value'];
      data['mode'] = CONST.ACTIVE_EFFECT_MODES.ADD;
    } else if (modifier_category === 'Weapon Stat' || modifier_category === 'Armor Stat') {
      // the only weapon/armor modifier which requires an active effect on the actor is encumbrance
      if (modifier === 'encumbrance') {
        data['keys'] = ['system.stats.encumbrance.value'];
      }
    } else {
      console.log(`UNKNOWN MODIFIER: ${modifier_category}, ${modifier}`)
    }
    return data;
  }

  /**
   * Given the updated selection of a modifier, update the corresponding active effect
   * @param item - item containing the active effect (and item on which the modifier was changed)
   * @param effect_id - name of input box for a particular modifier (the active effect shares this name)
   * @param modifier_category - the "modifier type" selected
   * @param modifier - the "modifier" selected
   * @param modifier_value - the "value" selected (true/false for some mods)
   * @param active - OPTIONAL. if the active effect should currently be supplied or not. if not supplied, assumed to be true.
   * @returns {Promise<void>}
   */
  static async updateActiveEffect(item, effect_id, modifier_category, modifier, modifier_value, active=null) {
    if (item?.parent !== null) {
      if (active === null) {
        active = true;
      }
      await ModifierHelpers.updateEmbeddedActiveEffect(
          item.parent,
          item.uuid,
          effect_id,
          modifier_category,
          modifier,
          modifier_value,
          active,
      );
      return;
    }
    console.log("updating AE")
    let uuid = item.uuid;
    // TODO: we really should check if this data has changed rather than forcing a full update each time
    let active_effect = item.getEmbeddedCollection("ActiveEffect").filter(i => (i.origin === uuid) && (i.label === effect_id));
    if (active_effect.length === 0) {
      console.log("Could not find active effect - :|")
      return;
    }
    console.log(item.id)
    console.log(item)
    for (let current_effect of active_effect) {
      console.log(current_effect.origin)
      console.log(`updating active effect ${current_effect.label}`)
      let changes = [];
      // lookup relevant keys
      console.log(`looking up details for category ${modifier_category} with selection of ${modifier}`)
      let data =  ModifierHelpers.determineModifierKey(modifier_category, modifier);
      console.log("found data:")
      console.log(data)
      console.log("new value")
      console.log(modifier_value)
      data['keys'].forEach(function (key) {
        changes.push({
          key: key,
          mode: data['mode'],
          value: modifier_value
        });
      });
      // do the update
      await current_effect.update({
        changes: changes,
      });
      if (active !== null) {
        // if the caller specified active, set it
        // (reversed because the property in Foundry is _disabled_ and we use _active_)
        await current_effect.update({
          disabled: !active,
        });
      }
      console.log("resulting effect:")
      console.log(current_effect)
    }
  }

  static async createBasicActiveEffects(item, item_type) {
    if (item_type === 'species') {
      // create characteristics active effects
      Object.keys(CONFIG.FFG.characteristics).forEach(await async function(characteristic) {
        await item.createEmbeddedDocuments(
          "ActiveEffect",
          [{
            label: characteristic,
            icon: "icons/svg/aura.svg",
            origin: item.uuid,
            disabled: false,
            transfer: true,
            changes: [{
              // TODO: this mapping should be a global somewhere, not hidden away and reconstructed in various functions
              key: `system.attributes.${characteristic}.value`,
              mode: CONST.ACTIVE_EFFECT_MODES.ADD,
              value: '0',
            }]
          }]
        );
      });
      // create wounds and strain active effects
      await item.createEmbeddedDocuments(
        "ActiveEffect",
        [
          {
            label: 'Wounds',
            icon: "icons/svg/aura.svg",
            origin: item.uuid,
            disabled: false,
            transfer: true,
            changes: [{
              key: `system.attributes.Wounds.value`,
              mode: CONST.ACTIVE_EFFECT_MODES.ADD,
              value: '0',
            }]
          },
          {
            label: 'Strain',
            icon: "icons/svg/aura.svg",
            origin: item.uuid,
            disabled: false,
            transfer: true,
            changes: [{
              key: `system.attributes.Strain.value`,
              mode: CONST.ACTIVE_EFFECT_MODES.ADD,
              value: '0',
            }]
          },
        ]
      );
    } else if (['weapon', 'armour', 'gear'].includes(item_type)) {
      await item.createEmbeddedDocuments(
        "ActiveEffect",
        [{
          label: "Encumbrance (Current)",
          icon: "icons/svg/aura.svg",
          origin: item.uuid,
          disabled: false,
          transfer: true,
          changes: [{
            // TODO: this mapping should be a global somewhere, not hidden away and reconstructed in various functions
            key: 'system.stats.encumbrance.value',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: '0',
          }]
        }]
      );
      await item.createEmbeddedDocuments(
        "ActiveEffect",
        [{
          label: "Encumbrance (Equipped)",
          icon: "icons/svg/aura.svg",
          origin: item.uuid,
          disabled: false,
          transfer: true,
          changes: [{
            // TODO: this mapping should be a global somewhere, not hidden away and reconstructed in various functions
            key: 'system.stats.encumbrance.value',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: '0',
          }]
        }]
      );
    } else if (item_type === 'shipattachment') {
      await item.createEmbeddedDocuments(
          "ActiveEffect",
          [{
            label: "Encumbrance (Current)",
            icon: "icons/svg/aura.svg",
            origin: item.uuid,
            disabled: false,
            transfer: true,
            changes: [{
              // TODO: this mapping should be a global somewhere, not hidden away and reconstructed in various functions
              key: 'system.stats.encumbrance.value',
              mode: CONST.ACTIVE_EFFECT_MODES.ADD,
              value: '0',
            }]
          }]
      );
      await item.createEmbeddedDocuments(
          "ActiveEffect",
          [{
            label: "Hardpoints",
            icon: "icons/svg/aura.svg",
            origin: item.uuid,
            disabled: false,
            transfer: true,
            changes: [{
              // TODO: this mapping should be a global somewhere, not hidden away and reconstructed in various functions
              key: 'system.stats.customizationHardPoints.value',
              mode: CONST.ACTIVE_EFFECT_MODES.ADD,
              value: '0',
            }]
          }]
      );
      await item.createEmbeddedDocuments(
          "ActiveEffect",
          [{
            label: "Speed",
            icon: "icons/svg/aura.svg",
            origin: item.uuid,
            disabled: false,
            transfer: true,
            changes: [{
              // TODO: this mapping should be a global somewhere, not hidden away and reconstructed in various functions
              key: 'system.stats.speed.value',
              mode: CONST.ACTIVE_EFFECT_MODES.ADD,
              value: '0',
            }]
          }]
      );
    } else if (item_type === 'shipweapon') {
        await item.createEmbeddedDocuments(
          "ActiveEffect",
          [{
            label: "Encumbrance (Current)",
            icon: "icons/svg/aura.svg",
            origin: item.uuid,
            disabled: false,
            transfer: true,
            changes: [{
              // TODO: this mapping should be a global somewhere, not hidden away and reconstructed in various functions
              key: 'system.stats.encumbrance.value',
              mode: CONST.ACTIVE_EFFECT_MODES.ADD,
              value: '0',
            }]
          }]
      );
    } else {
      console.log(`unknown item type: ${item_type}`)
    }
  }

  static async updateAEsForEquip(actor, item, equipped) {
    // determine how much encumbrance our item is (across all of its AEs)
    // update the "equipped" encumbrance to that value - 3 (to a minimum of 0)
    // disable the "current" one and enable the "equipped" one
    // TODO: upstream issue somewhere. editing the encumbrance of an item on an actor doesn't properly update the AEs
    let uuid = item.uuid;
    if (equipped) {
      console.log("enabling equipped encumbrance")
      let total = ModifierHelpers.getActiveAEModifierValue(item, 'Encumbrance');
      await ModifierHelpers.updateEmbeddedActiveEffect(
        actor,
        uuid,
        'Encumbrance (Equipped)',
        'Encumbrance (Equipped)',
        '',
        Math.max(total - 3, 0), // configure it to be current encumbrance - 3
        true,
      );
      await ModifierHelpers.updateEmbeddedActiveEffect(
        actor,
        uuid,
        'Encumbrance (Current)',
        'Encumbrance (Current)',
        '',
        total,
        false,
      );
    } else {
      console.log("disabling equipped encumbrance")
      await ModifierHelpers.updateEmbeddedActiveEffect(
        actor,
        uuid,
        'Encumbrance (Equipped)',
        'Encumbrance (Equipped)',
        '',
        0,
        false,
      );
      let total = ModifierHelpers.getActiveAEModifierValue(item, 'Encumbrance');
      await ModifierHelpers.updateEmbeddedActiveEffect(
        actor,
        uuid,
        'Encumbrance (Current)',
        'Encumbrance (Current)',
        '',
        total,
        true,
      );
    }
  }

  /**
   * Update an embedded AE. "Embedded" here refers to an AE already on an actor.
   * You can't directly edit an AE on an item if that item is on an actor
   * @param actor - actor which the AE has been applied to
   * @param uuid - item UUID. used to compare the origin to make sure we're editing the one from the item
   * @param effect_id - name of input box for a particular modifier (the active effect shares this name)
   * @param modifier_category - the "modifier type" selected
   * @param modifier - the "modifier" selected
   * @param value - the "value" selected (true/false for some mods)
   * @param active - OPTIONAL. if the active effect should currently be supplied or not. if not supplied, assumed to be true.
   * @returns {Promise<void>}
   */
  static async updateEmbeddedActiveEffect(actor, uuid, effect_id, modifier_category, modifier, value, active) {
    let effect = actor.effects.filter(i => (i.origin === uuid) && (i.label === effect_id));
    if (!effect) {
      console.log("could not find AE")
      return;
    }
    effect = effect[0];
    for (let change of effect.changes) {
      let changes = [];
      let data =  ModifierHelpers.determineModifierKey(modifier_category, modifier);
      data['keys'].forEach(function (key) {
        changes.push({
          key: key,
          mode: data['mode'],
          value: value,
        });
      });
      await effect.update({changes: changes});
    }
    await effect.update({disabled: !active});
  }

  /**
   * Look up how much an attribute is being modified by active effects
   * Useful for updating actor forms
   * @param actor - actor on which the AEs exist
   * @param attribute - attribute being modified by the AEs
   * @returns {number} - INT - the number the attribute is modified by
   */
  static getActiveAEModifierValue(actor, attribute) {
    // TODO: this can probably be enhanced to return the source as well (to retain the feature... I asked for :p)
    // find (active) active effects
    //console.log(`Looking for AEs impacting ${attribute} on ${actor.name}`)
    const effects = actor.effects.contents.filter(i => i.disabled === false);
    let value = 0;
    effects.forEach(function (effect) {
      // step through the changes
      effect.changes.forEach(function (change) {
        // check if the change key is the key for our attribute
        if (change.key === `system.attributes.${attribute}.value` || change.key === testMap[attribute] || change.key === `system.stats.${attribute.toLowerCase()}.value` || change.key === `system.stats.${attribute}.value`) {
          if (change.mode === CONST.ACTIVE_EFFECT_MODES.ADD) {
            value += parseInt(change.value);
          } else if (change.mode === CONST.ACTIVE_EFFECT_MODES.SUBTRACT) {
            // I don't think subtract is actually used anywhere, but just in case...
            value -= parseInt(change.value);
          } else {
            // TODO: this should be a real warning, most likely
            console.log(`Found unexpected effect mode on ${actor.name} / ${effect.label}. Change key: ${change.key}, mode: ${change.mode}`)
          }
        }
      });
    });
    return value;
  }

  /**
   * Update the encumbrance value for gear on an actor when the +/- buttons are clicked
   * @param actor - actor the gear is on
   * @param item - item being +/-'ed
   * @param mode - "increase" for + and "decrease" for -
   * @returns {Promise<void>}
   */
  static async updateActiveEffectForGear(actor, item, mode) {
    let effects = actor.effects.contents;
    let uuid = `Actor.${actor.id}.Item.${item.id}`;
    let current_value = item.system.quantity.value;
    let previous_value;
    if (mode === 'increase') {
      previous_value = current_value - 1;
    } else if (mode === 'decrease') {
      previous_value = current_value + 1;
    }
    let filtered_effects =  effects.filter(i => i.origin === uuid && i.label === 'Encumbrance (Current)');
    if (filtered_effects.length === 0) {
      console.log("found no matching effects")
      return;
    }

    if (current_value > 0 && previous_value !== 0) {
      for (let effect of filtered_effects) {
        if (effect.changes.length === 0) {
          // don't attempt to do things if there aren't any changes
          break;
        }
        let original_value = parseInt(effect.changes[0].value) / previous_value
        await effect.update({
          changes: [{
            key: "system.stats.encumbrance.value",
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            priority: null,
            value: original_value * current_value,
          }],
        });
      }
    }
    else {
      // toggle suspending the AE instead
      for (let effect of filtered_effects) {
        if (effect.changes.length === 0) {
          console.log("found no matching effects")
          // don't attempt to do things if there aren't any changes
          break;
        }
        await effect.update({
          disabled: !effect.disabled,
        });
      }
    }
  }

  /**
   * Look up (active) active effects modifying a particular skill, e.g. "add boost"
   * @param actor - actor to search for matching Active Effects on
   * @param skill - name of the skill to search for
   * @param modifier_type - type of modifier to that skill
   */
  static getActiveSkillAEModifierValue(actor, skill, modifier_type) {
    // TODO: this can probably be enhanced to return the source as well (to retain the feature... I asked for :p)
    // find (active) active effects
    //console.log(`Looking for skill AEs impacting ${skill}/${modifier_type} on ${actor.name}`)
    const effects = actor.effects.contents.filter(i => i.disabled === false);
    let value = 0;
    let sources = [];
    effects.forEach(function (effect) {
      // step through the changes
      effect.changes.forEach(function (change) {
        // check if the change key is the key for our attribute
        if (change.key === `system.skills.${skill}.${testSkillModMap[modifier_type]}`) {
          if (isNaN(parseInt(change.value))) {
            // this is not a number value; skip other checks
            value = change.value;
          }
          else if (change.mode === CONST.ACTIVE_EFFECT_MODES.ADD) {
            value += parseInt(change.value);
          } else if (change.mode === CONST.ACTIVE_EFFECT_MODES.SUBTRACT) {
            // I don't think subtract is actually used anywhere, but just in case...
            value -= parseInt(change.value);
          } else {
            // TODO: this should be a real warning, most likely
            console.log(`Found unexpected skill effect mode on ${actor.name} / ${effect.label}. Change key: ${change.key}, mode: ${change.mode}`)
          }
        }
      });
    });
    //console.log(`Final ${skill} value: ${value}, sources; ${sources}`)
    return {
      'total': value,
      'sources': sources,
    };
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

  static determine_item_mods(item) {
    console.log("looking up")
    console.log(item)
    let data = [];
    if (item.type === 'itemattachment' || item.type === 'itemmodifier') {
      console.log("attachment")
      if (item.system.type === 'weapon') {
        console.log('weapon')
        data = [
          'weapon_mod_types',
        ];
      } else if (item.system.type === 'armour') {
        data = [
          'armor_mod_types',
        ];
      } else if (item.system.type === 'vehicle') {
        data = [
          'vehicle_mod_types',
        ];
      } else {
        console.log(item.system.type)
        data = [
          'mod_types',
        ];
      }
    }
    else if (item.type === 'talent' || item.type === 'specialization') {
      data = [
          'mod_types',
      ];
    }
    else if (item.type === "weapon") {
        data = [
          'weapon_mod_types',
        ];
    }
    else if (item.type === "armour") {
        data = [
          'armor_mod_types',
        ];
    }
    else if (item.type === "vehicle") {
        data = [
          'vehicle_mod_types',
        ];
    }
    else {
        data = [
          'mod_types',
        ];
    }
    console.log(data)
    return data;
  }

  static async getDicePoolModifiers(pool, item, items) {
    let dicePool = new DicePoolFFG(pool);

    return dicePool;
  }

  static applyBrawnToDamage(data) {
    if(data.characteristic?.value !== "" && data.characteristic?.value !== undefined) {
      return true;
    }

    return false;
  }
}
