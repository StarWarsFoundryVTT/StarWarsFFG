/**
 * A specialized form used to pop out the editor.
 * @extends {FormApplication}
 */

import ModifierHelpers from "./helpers/modifiers.js";
export default class PopoutModifiers extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "popout-modifiers",
      classes: ["starwarsffg", "sheet"],
      title: "Pop-out Modifiers",
      template: "systems/starwarsffg/templates/items/dialogs/ffg-popout-modifiers.html",
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      resizable: true,
      width: 320,
      height: 320,
    });
  }

  /**
   * Return a reference to the target attribute
   * @type {String}
   */
  get attribute() {
    return this.options.name;
  }

  /** @override */
  getData() {
    const data = {
      data: this.object.system,
      modTypeSelected: "all",
      modifierTypes: CONFIG.FFG.allowableModifierTypes,
      modifierChoices: CONFIG.FFG.allowableModifierChoices,
    };

    if (this.object.isUpgrade) {
      data.data = this.object.parent.system.upgrades[this.object.keyname];
    } else if (this.object.isTalent) {
      data.data = this.object.parent.system.talents[this.object.keyname];
    }

    data.FFG = CONFIG.FFG;
    data.cssClass = "editable popout-modifiers-window attributes";

    // Return data
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    if (!this.options.editable) return;

    //html.find(".attributes .attribute-control").on("click", () => { alert("here")});
    html.find(".attributes").on("click", ".attribute-control", ModifierHelpers.onClickAttributeControl.bind(this));
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    formData = foundry.utils.expandObject(formData);

    // Handle the free-form attributes list
    const formAttrs = foundry.utils.expandObject(formData)?.data?.attributes || {};
    const attributes = Object.values(formAttrs).reduce((obj, v) => {
      let k = v["key"].trim();
      if (/[\s\.]/.test(k)) return ui.notifications.error("Attribute keys may not contain spaces or periods");
      delete v["key"];
      obj[k] = v;
      return obj;
    }, {});

    // Remove attributes which are no longer used
    if (this.object.system?.attributes) {
      for (let k of Object.keys(this.object.system.attributes)) {
        if (!attributes.hasOwnProperty(k)) attributes[`-=${k}`] = null;
      }
    }

    // recombine attributes to formData
    if (Object.keys(attributes).length > 0) {
      foundry.utils.setProperty(formData, `data.attributes`, attributes);
    }

    if (this.object.isUpgrade) {
      // redo the earlier code but with the proper attribute path
      // Remove attributes which are no longer used
      if (this.object.parent.system.upgrades[this.object.keyname].attributes) {
        for (let k of Object.keys(this.object.parent.system.upgrades[this.object.keyname].attributes)) {
          if (!attributes.hasOwnProperty(k)) attributes[`-=${k}`] = null;
        }
      }

      // recombine attributes to formData
      if (Object.keys(attributes).length > 0) {
        foundry.utils.setProperty(formData, `data.attributes`, attributes);
      }

      let data = attributes;

      let upgradeFormData = {};
      foundry.utils.setProperty(upgradeFormData, `data.upgrades.${this.object.keyname}.attributes`, data);

      upgradeFormData.system = upgradeFormData.data;
      delete upgradeFormData.data;
      delete upgradeFormData._id;

      await this.object.parent.update(upgradeFormData);
    } else if (this.object.isTalent) {
      // redo the earlier code but with the proper attribute path
      // Remove attributes which are no longer used
      if (this.object.parent.system.talents[this.object.keyname].attributes) {
        for (let k of Object.keys(this.object.parent.system.talents[this.object.keyname].attributes)) {
          if (!attributes.hasOwnProperty(k)) {
            attributes[`-=${k}`] = null;
          }
        }
      }
      let test_item = await game.items.get(this.object.parent.system.talents[this.object.keyname]?.itemId);
      if (this.object.parent.system.talents[this.object.keyname].pack || test_item) {
        ui.notifications.error(game.i18n.localize("SWFFG.Notifications.TalentEditGlobally"));
        return;
      }

      // recombine attributes to formData
      if (Object.keys(attributes).length > 0) {
        foundry.utils.setProperty(formData, `data.attributes`, attributes);
      }

      let data = attributes;

      let upgradeFormData = {};
      foundry.utils.setProperty(upgradeFormData, `data.talents.${this.object.keyname}.attributes`, data);

      upgradeFormData.system = upgradeFormData.data;
      delete upgradeFormData.data;
      delete upgradeFormData._id;
      await this.object.parent.update(upgradeFormData);
    } else {
      // Update the Item
      const syncFormData = foundry.utils.deepClone(formData);
      if (syncFormData?.data?.attributes) {
        for (const attr of Object.keys(syncFormData.data.attributes)) {
          if (attr.startsWith("-=")) {
            delete syncFormData.data.attributes[attr];
          }
        }
      }
      await ModifierHelpers.applyActiveEffectOnUpdate(this.object, syncFormData);
      // sets _id, which is not settable
      formData.system = formData.data;
      delete formData.data;
      delete formData._id;
      await this.object.update(formData);
    }
    this.render();
  }
}
