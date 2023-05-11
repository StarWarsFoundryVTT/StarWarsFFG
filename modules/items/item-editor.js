import ItemHelpers from "../helpers/item-helpers.js";

export class UpdateEmbeddedAttachment extends FormApplication {
  constructor(object, options) {
    super(object, options)
  }


  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/starwarsffg/templates/items/embedded/ffg-itemattachment-edit.html"
    });
  }

  getData(options = {}) {
    return super.getData();
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".embedded_modifier .embedded_selector").on("change", UpdateEmbeddedAttachment.updateDropdown.bind(this));
    html.find(".mod_control").on("click", UpdateEmbeddedAttachment.modControl.bind(this));
    html.find(".modifier_control").on("click", UpdateEmbeddedAttachment.modifierControl.bind(this));
  }

  /**
   * Updates the modifier 2nd level selector when the 1st level is updated
   * @param event "change" event
   */
  static updateDropdown(event) {
    let new_value = event.currentTarget.value;
    let dropdown = event.currentTarget.getAttribute('data-selector');
    let id = event.currentTarget.getAttribute('data-id');
    let mod_id = event.currentTarget.getAttribute('data-mod-id');
    if (dropdown === 'modtype') {
      let key;
      // TODO: is there a way to dynamically read these?
      // why in the world do these not have keys for each other?!
      if (new_value === 'Result Modifiers') {
        key = 'itemmodifier_resultmodifiers';
      } else if (new_value === 'Dice Modifiers') {
        key = 'itemmodifier_dicemodifiers';
      } else if (new_value === 'Roll Modifiers') {
        key = 'itemmodifier_rollmodifiers';
      } else if (new_value === 'Weapon Stat') {
        key = 'weapon_stats';
      } else if (new_value === 'Armor Stat') {
        key = 'armor_stats';
      } else {
        console.log(`UNKNOWN MOD TYPE: ${new_value}`)
        return;
      }
      let new_html = '';
      let chosen_config = this.object.config[key];
      Object.keys(chosen_config).forEach(function (choice) {
        new_html += `<option value="${chosen_config[choice]['value']}">${game.i18n.localize(chosen_config[choice]['label'])}</option>`
      });
      $(`[data-selector='modmod'][data-id='${id}'][data-mod-id='${mod_id}']`).html(new_html);
    } else if (dropdown === 'modmod') {
      // ignore, we don't need to update anything
    } else {
      console.log(`UNKNOWN DROPDOWN SELECTED: ${dropdown}`)
    }
  }

  /**
   * Controls creating, deleting, or modifying mods (which contain modifiers)
   * @param event
   */
  static async modControl(event) {
    let action = event.currentTarget.getAttribute('data-action');
    if (action === 'create') {
      let new_id = $(".embedded_mod").length;
      let rendered = await renderTemplate(
        'systems/starwarsffg/templates/items/embedded/partial/ffg-mod.html',
        {
          index: new_id,
          config: CONFIG.FFG,
          installed_mod: {
            name: "new mod",
            img: "icons/svg/item-bag.svg",
            description: "desc goes here",
            modifiers: [],
          },
        }
      );
      $(event.currentTarget).parent().children('.mod_container').append(rendered);
      // update the listeners, so we catch events on these new entries
      this.activateListeners($(event.currentTarget).parent().children('.mod_container'));
    } else if (action === 'delete') {
      $(event.currentTarget).parent().parent().parent().remove();
    }
  }

  /**
   * Controls creating, deleting, or modifying modifiers
   * @param event
   */
  static async modifierControl(event) {
    let action = event.currentTarget.getAttribute('data-action');
    let new_id = $(".embedded_modifier").length;
    let mod_id = event.currentTarget.getAttribute('data-mod-id');
    if (action === 'create') {
      let rendered = await renderTemplate(
        'systems/starwarsffg/templates/items/embedded/partial/ffg-modifier.html',
        {
          index: new_id,
          config: CONFIG.FFG,
          mod: {
            modtype: "Result Modifiers",
            value: 1,
            active: true,
          },
          mod_id: mod_id,
          attr: `attr${new Date().getTime()}`,
        }
      );
      $(event.currentTarget).parent().children('.modifier_container').append(rendered);
      // update the listeners, so we catch events on these new entries
      this.activateListeners($(event.currentTarget).parent().children('.modifier_container'));
    } else if (action === 'delete') {
      $(event.currentTarget).parent().parent().remove();
    }
  }

  async _updateObject(event, formData) {
    if (formData['submission_type'] === 'itemattachment') {
      // format the data to something mildly useful
      let restricted = true;
      if (formData['attachment_restricted'] === null) {
        restricted = false;
      }
      let data = {
        nonce: formData['attachment_nonce'],
        name: formData['attachment_name'],
        img: formData['attachment_img'],
        type: formData['attachment_type'],
        system: {
          renderedDesc: formData['attachment_renderedDesc'],
          type: formData['attachment_system_type'],
          hardpoints: {
            value: formData['attachment_hardpoints'],
          },
          rarity: {
            value: formData['attachment_rarity'],
            isrestricted: restricted,
          },
          price: {
            value: formData['attachment_price'],
          },
          installed_mods: [],
          attributes: {},
        }
      };
      // start building mod data
      let mod_data = {};
      Object.keys(formData).filter(i => i.includes("mod_name")).forEach(function (mod) {
        let mod_index = mod.split('-')[0];
        mod_data = {
          name: formData[`${mod_index}-mod_name`],
          img: formData[`${mod_index}-mod_img`], // TODO: image selector doesn't work
          description: formData[`${mod_index}-mod_description`],
          mod_link_id: formData[`${mod_index}-mod_link_id`],
          modifiers: [],
        }
        // start building modifier data
        Object.keys(formData).filter(x => x.includes("modifier_modtype")).forEach(function (modifier) {
          // represents the MOD index this modifier is on
          let modifier_mod_index = modifier.split('-')[0];
          let modifier_index = modifier.split('-')[1];
          if (modifier_mod_index === mod_index) {
            // done like this because js doesn't let you dynamically access keys if it isn't already defined
            let new_data = {};
            new_data[formData[`${modifier_mod_index}-${modifier_index}-modifier_attr`]] = {
              modtype: formData[`${modifier_mod_index}-${modifier_index}-modifier_modtype`],
              value: formData[`${modifier_mod_index}-${modifier_index}-modifier_value`],
              mod: formData[`${modifier_mod_index}-${modifier_index}-modifier_mod`],
              active: formData[`${modifier_mod_index}-${modifier_index}-modifier_active`],
            };
            mod_data['modifiers'].push(new_data);
          }
        });
        data['system']['installed_mods'].push(mod_data);
      });
      console.log("updating attachment, final data:")
      console.log(data)
      // retrieve existing attachments, so we don't delete the other ones
      let attachments = this.object.parent.system.itemattachment.filter(i => i.nonce !== data['nonce']);
      attachments.push(data);
      // actually perform the update
      await this.object.parent.update({
        system: {
          itemattachment: attachments,
        },
      });
      await ItemHelpers.syncActiveEffects(this.object.parent);
    } else if (formData['submission_type'] === 'itemmodifier') {
      let data = {
        name: formData['attachment_name'],
        img: formData['attachment_img'],
        description: formData['quality_desc'],
        link_id: formData['modifier_link'],
        type: formData['submission_type'],
        system: {
          rank: formData['modifier_rank'],
          type: formData['attachment_system_type'],
        },
        modifiers: [],
      };
      Object.keys(formData).filter(x => x.includes("modifier_modtype")).forEach(function (modifier) {
        // represents the MOD index this modifier is on
        let modifier_index = modifier.split('-')[1];
        // done like this because js doesn't let you dynamically access keys if it isn't already defined
        let new_data = {};
        new_data[formData[`-${modifier_index}-modifier_attr`]] = {
          modtype: formData[`-${modifier_index}-modifier_modtype`],
          value: formData[`-${modifier_index}-modifier_value`],
          mod: formData[`-${modifier_index}-modifier_mod`],
          active: formData[`-${modifier_index}-modifier_active`],
        };
        data['modifiers'].push(new_data);
      });
      // retrieve existing attachments, so we don't delete the other ones
      let qualities = this.object.parent.system.itemmodifier.filter(i => i.link_id !== data['link_id']);
      qualities.push(data);
      // actually perform the update
      await this.object.parent.update({
        system: {
          itemmodifier: qualities,
        },
      });
      await ItemHelpers.syncActiveEffects(this.object.parent);
    } else {
      console.log("unknown embedded item editor submission")
    }
  }
}