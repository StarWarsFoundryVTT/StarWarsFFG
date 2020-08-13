/**
 * A specialized form used to pop out the editor.
 * @extends {FormApplication}
 */

import ModifierHelpers from "./helpers/modifiers.js";
export default class PopoutModifiers extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
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
    const data = this.object.data;

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
    // Handle the free-form attributes list
    const formAttrs = expandObject(formData)?.data?.attributes || {};
    const attributes = Object.values(formAttrs).reduce((obj, v) => {
      let k = v["key"].trim();
      if (/[\s\.]/.test(k)) return ui.notifications.error("Attribute keys may not contain spaces or periods");
      delete v["key"];
      obj[k] = v;
      return obj;
    }, {});

    // Remove attributes which are no longer used
    if (this.object.data?.data?.attributes) {
      for (let k of Object.keys(this.object.data.data.attributes)) {
        if (!attributes.hasOwnProperty(k)) attributes[`-=${k}`] = null;
      }
    }

    // // Re-combine formData
    // formData = Object.entries(formData)
    //   .filter((e) => !e[0].startsWith("data.attributes"))
    //   .reduce(
    //     (obj, e) => {
    //       obj[e[0]] = e[1];
    //       return obj;
    //     },
    //     { _id: this.object._id, "data.attributes": attributes }
    //   );

    if (this.object.isUpgrade) {
      let data = formData.data.attributes;

      let upgradeFormData;
      setProperty(upgradeFormData, `data.upgrades.${this.object.keyname}.attributes`, data);

      // let upgradeFormData = {
      //   [`data.upgrades.${this.object.keyname}.attributes`]: data,
      // };

      await this.object.parent.update(upgradeFormData);
    } else {
      // Update the Item
      await this.object.update(formData);
    }
    this.render();
  }
}
