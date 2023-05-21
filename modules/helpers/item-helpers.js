import ImportHelpers from "../importer/import-helpers.js";
import ModifierHelpers from "./modifiers.js";

export default class ItemHelpers {
  static async itemUpdate(event, formData) {
    // TODO: if the item is on an actor, it cannot be updated. we need to handle this and prevent updates.
    formData = expandObject(formData);

    ///*
    console.log("hello updating item")
    console.log(event)
    console.log(formData)
    console.log(this)

     //*/
    if (this.object.getFlag("starwarsffg", "ffgIsTemp")) {
      // temporary object, update the parent object instead
      // TODO: handle this key not being present in the flag (or the flag being undefined)
      await ItemHelpers.updateParent(this, formData, this.object.getFlag("starwarsffg", "ffgParent")['starwarsffg']['ffgTempId']);
      return;
    }

    if (this.object.isEmbedded && this.object.actor?.compendium?.metadata) {
      return;
    }
    CONFIG.logger.debug(`Updating ${this.object.type}`);

    if (this.object.type === "weapon") {
      if (ModifierHelpers.applyBrawnToDamage(formData.data)) {
        setProperty(formData, `data.damage.value`, 0);
      }
    }

    // Handle the free-form attributes list
    const formAttrs = expandObject(formData)?.data?.attributes || {};
    const attributes = Object.values(formAttrs).reduce((obj, v) => {
      let k = v["key"].trim();
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

    // update encumbrance to show the current encumbrance
    if (['weapon', 'armour', 'gear'].includes(this.object.type)) {
      console.log("Caught item update with encumbrance")
      await ModifierHelpers.updateActiveEffect(
          this.item,
          'Encumbrance (Current)',
          'Encumbrance (Current)',
          '',
          formData.data.encumbrance.value
      );
    }
    else if (this.object.type === 'shipattachment') {
      console.log("Caught ship attachment update with encumbrance")
      console.log(formData)
      console.log(this.object)
      if (!this.actor) {
        await ModifierHelpers.updateActiveEffect(
            this.item,
            'Encumbrance (Current)',
            'Encumbrance (Current)',
            '',
            formData.data.encumbrance.value,
        );
        await ModifierHelpers.updateActiveEffect(
            this.item,
            'Hardpoints',
            'Hardpoints',
            '',
            formData.data.hardpoints.value * -1, // we want to reduce hardpoints, not add
        );
      }
    }

    // update active effects to reflect the currently-selected attributes
    for (let key in formData.data.attributes) {
      // TODO: these sections look very similar, can we simplify the code?
      if (key.includes('attr')) {
        let active_effect_id = key;
        let mod_type = formData.data.attributes[key].modtype;
        let mod = formData.data.attributes[key].mod;
        let mod_value = formData.data.attributes[key].value;
        await ModifierHelpers.updateActiveEffect(this.item, active_effect_id, mod_type, mod, mod_value);

      } else {
        // handle non-mod changes
        let active_effect_id = key; // ex: Agility
        let mod_type = formData.data.attributes[key].modtype;
        let mod = formData.data.attributes[key].mod;
        let mod_value = formData.data.attributes[key].value;
        await ModifierHelpers.updateActiveEffect(this.item, active_effect_id, mod_type, mod, mod_value);
      }
    }

    // recombine attributes to formData
    if (Object.keys(attributes).length > 0) {
      setProperty(formData, `data.attributes`, attributes);
    }

    // migrate data to v10 structure
    let updated_id = formData._id;
    delete formData._id;

    setProperty(formData, `flags.starwarsffg.loaded`, false);

    // Update the Item
    try {
      // v10 items are no longer created in the global scope if they exist only on an actor (or another item)
      if (this.object.flags.starwarsffg.ffgParent.starwarsffg.ffgTempId) {
        let parent_object = await game.items.get(this.object.flags.starwarsffg.ffgParent.starwarsffg.ffgTempId);

        // search for the relevant attachment
        let updated_items = [];
        parent_object.system.itemattachment.forEach(function (i) {
          if (i._id === updated_id) {
              // this is the item we want to update, replace it
              i = formData;
          }
          updated_items.push(i)
        });
        await parent_object.update({'system': {'itemattachment': updated_items}});

        // search for the relevant quality
        updated_items = [];
        parent_object.system.itemmodifier.forEach(function (i) {
          if (i._id === updated_id) {
              // this is the item we want to update, replace it
              i = formData;
          }
          updated_items.push(i)
        });
        await parent_object.update({'system': {'itemmodifier': updated_items}});

      }
    } catch (error) {
        await this.object.update(formData);
    }

    if (this.object.type === "talent") {
      if (this.object.flags?.clickfromparent?.length) {
        let listofparents = JSON.parse(JSON.stringify(this.object.flags.clickfromparent));
        while (listofparents.length > 0) {
          const parent = listofparents.shift();
          const spec = await fromUuid(parent.id);
          if (spec) {
            let updateData = {};
            setProperty(updateData, `data.talents.${parent.talent}.name`, formData.name);
            setProperty(updateData, `data.talents.${parent.talent}.description`, formData.data.description);
            setProperty(updateData, `data.talents.${parent.talent}.activation`, formData.data.activation.value);
            setProperty(updateData, `data.talents.${parent.talent}.isRanked`, formData.data.ranks.ranked);
            setProperty(updateData, `data.talents.${parent.talent}.isForceTalent`, formData.data.isForceTalent);
            setProperty(updateData, `data.talents.${parent.talent}.isConflictTalent`, formData.data.isConflictTalent);

            // Remove attributes which are no longer used
            if (spec?.system?.talents?.[parent.talent]?.attributes) {
              for (let k of Object.keys(spec.system.talents[parent.talent].attributes)) {
                if (!formData.data.attributes.hasOwnProperty(k)) formData.data.attributes[`-=${k}`] = null;
              }
            }

            setProperty(updateData, `data.talents.${parent.talent}.attributes`, formData.data.attributes);

            if (parent.id.includes(".OwnedItem.")) {
              const ids = parent.id.split(".OwnedItem.");
              const actor = await fromUuid(ids[0]);
              const item = await actor.items.get(ids[1]);
              setProperty(updateData, `flags.starwarsffg.loaded`, false);
              await item.update(updateData);
              await item.sheet.render(true);
            } else {
              setProperty(updateData, `flags.starwarsffg.loaded`, false);
              await spec.update(updateData);
              await spec.sheet.render(true);
            }
          }
        }
      }
    }
  }

  /**
   * Given a parent and child item, move all modifiers to the parent item
   * @param parent_item - item, e.g. armor or weapon
   * @param mod_item - item_modifier
   * @returns {Promise<void>}
   */
  static async createEmbeddedModifier(parent_item, mod_item) {
    if (mod_item.type !== 'itemmodifier') {
      console.log("you cannot do this for non-modifiers")
      return;
    }
    const embedded_modifiers = parent_item.system.attributes;
    for (let modifier of Object.keys(mod_item.system.attributes)) {
      // using the same key means multiple drag-and-drops will override the previous value
      embedded_modifiers[`attr${Date.now()}`] = mod_item.system.attributes[modifier];
    }
    console.log(embedded_modifiers)
    parent_item.update({
      system: {
        attributes: embedded_modifiers,
      },
    });
    // transfer active effects
    await ItemHelpers.transferActiveEffects(mod_item, parent_item, randomID());
  }

  static async updateParent(embedded_item, form_data, parent_id) {
    console.log("updating parent")
    console.log(embedded_item)
    console.log(form_data)
    console.log(parent_id)
    let parent = game.items.get(parent_id);
    let nonce = embedded_item.object.getFlag('starwarsffg', 'ffgNonce')
    // convert to item format
    form_data['system'] = form_data['data'];
    form_data['type'] = embedded_item.object.getFlag('starwarsffg', 'ffgTempItemType');
    await ItemHelpers.createEmbeddedAttachment(parent, form_data, nonce);
    // TODO: additionally (hooray), the description field isn't submitted at all

    console.log(nonce)

    // find relevant base mods
    let existing_active_effects = [];
    parent.getEmbeddedCollection(
        'ActiveEffect'
    ).filter(
        i => i.getFlag('starwarsffg', 'associated_item') === nonce
    ).forEach(function(ae) {
      existing_active_effects.push(ae.id);
    });
    console.log("removing existing AEs:")
    console.log(existing_active_effects)
    // delete related base mods
    await parent.deleteEmbeddedDocuments('ActiveEffect', existing_active_effects);

    // find base mods
    Object.keys(form_data.system.attributes).forEach(await async function (attr) {
      // TODO: this should be a function because it's now repeated in two places
      let field = form_data.system.attributes[attr];

      console.log(`creating AE with label ${attr}`)
      await parent.createEmbeddedDocuments("ActiveEffect", [{
        label: attr,
        icon: "icons/svg/aura.svg",
        origin: parent.uuid,
        disabled: false,
        transfer: true,
      }]);

      await ModifierHelpers.updateActiveEffect(parent, attr, field.modtype, field.mod, field.value);
      parent.getEmbeddedCollection(
          'ActiveEffect'
      ).filter(i => i.label === attr).forEach(function (new_ae) {
        console.log(`updating new AE with flag of ${nonce}`)
        new_ae.setFlag('starwarsffg', 'associated_item', nonce);
      });
    });

    // pull the key for each mod

    // create an AE

    // apply changes - determineModifierKey
  }

  /**
   * For a given object, look through all attachments, qualities, and mods, and make sure AEs exist where they should
   * @param parent_item
   * @returns {Promise<void>}
   */
  static async syncActiveEffects(parent_item) {
    console.log("syncing active effects")
    console.log(parent_item)
    let active_effects = parent_item.getEmbeddedCollection('ActiveEffect').contents; // already-existing AEs
    let touched_modifiers = []; // list of everything we've found still in the direct-embed data
    let to_delete = []; // list of AE IDs to delete
    // iterate over attachments
    for (const attachment of parent_item.system.itemattachment) {
      // iterate over installed mods on each attachment
      for (const mod of attachment.system.installed_mods) {
        // iterate over modifiers on each mod
        for (const modifier of mod.modifiers) {
          let modifier_label = Object.keys(modifier)[0]; // attr<blahblah>
          let modifier_data = modifier[modifier_label]; // dict for modifier
          if (active_effects.filter(i => i.label === modifier_label).length === 0) {
            // AE does not exist, create it
            let created = await parent_item.createEmbeddedDocuments("ActiveEffect", [{
              label: modifier_label,
              icon: "icons/svg/aura.svg",
              origin: parent_item.uuid,
              disabled: false,
              transfer: true,
            }]);
            for (const created_active_effect of created) {
              let link_ids = [
                  attachment.nonce,
                  mod.mod_link_id,
              ];
              created_active_effect.setFlag('starwarsffg', 'link_ids', link_ids);
            }
          }
          // AE exists, update it
          await ModifierHelpers.updateActiveEffect(
            parent_item,
            modifier_label,
            modifier_data.modtype,
            modifier_data.mod,
            modifier_data.value,
          );
          touched_modifiers.push(modifier_label);
        }
        active_effects.forEach(function (active_effect) {
          let link_ids = active_effect.getFlag('starwarsffg', 'link_ids');
          if (link_ids && link_ids.includes(mod.mod_link_id) && !touched_modifiers.includes(active_effect.label)) {
            // this AE has been removed, delete it
            to_delete.push(active_effect.id);
          }
        });
      }
    }
    console.log("deleting unused AEs")
    console.log(to_delete)
    await parent_item.deleteEmbeddedDocuments('ActiveEffect', to_delete);
  }

  /**
   * Same as syncActiveEffects, but for specializations and otherwise syncing modifiers directly on the item
   *  (not coming from attachments/qualities)
   * @param parent_item
   * @returns {Promise<void>}
   */
  static async syncModifierActiveEffects(parent_item) {
    console.log("syncing active effects")
    console.log(parent_item)
    let active_effects = parent_item.getEmbeddedCollection('ActiveEffect').contents; // already-existing AEs
    let touched_modifiers = []; // list of everything we've found still in the direct-embed data
    let to_delete = []; // list of AE IDs to delete
    // iterate over attachments
    // TODO: validate that this list is complete
    // TODO: this should actually be a check to see if it has itemattachments so we can do it on all items
    // and the other else {} should be for attributes
    // once those two things are done, this entire function should fold into the normal syncAE function and go away
    if (['weapon', 'armor'].includes(parent_item.type)) {
      for (const attachment of parent_item.system?.itemattachment) {
        // iterate over installed mods on each attachment
        for (const mod of attachment.system?.installed_mods) {
          // iterate over modifiers on each mod
          for (const modifier of mod.modifiers) {
            let modifier_label = Object.keys(modifier)[0]; // attr<blahblah>
            let modifier_data = modifier[modifier_label]; // dict for modifier
            if (active_effects.filter(i => i.label === modifier_label).length === 0) {
              // AE does not exist, create it
              let created = await parent_item.createEmbeddedDocuments("ActiveEffect", [{
                label: modifier_label,
                icon: "icons/svg/aura.svg",
                origin: parent_item.uuid,
                disabled: false,
                transfer: true,
              }]);
              for (const created_active_effect of created) {
                let link_ids = [
                  attachment.nonce,
                  mod.mod_link_id,
                ];
                created_active_effect.setFlag('starwarsffg', 'link_ids', link_ids);
              }
            }
            // AE exists, update it
            await ModifierHelpers.updateActiveEffect(
                parent_item,
                modifier_label,
                modifier_data.modtype,
                modifier_data.mod,
                modifier_data.value,
            );
            touched_modifiers.push(modifier_label);
          }
          active_effects.forEach(function (active_effect) {
            let link_ids = active_effect.getFlag('starwarsffg', 'link_ids');
            if (link_ids && link_ids.includes(mod.mod_link_id) && !touched_modifiers.includes(active_effect.label)) {
              // this AE has been removed, delete it
              to_delete.push(active_effect.id);
            }
          });
        }
      }
    }
    else if (['specialization'].includes(parent_item.type)) {
      for (const talent_id of Object.keys(parent_item.system?.talents)) {
        let talent_data = parent_item.system.talents[talent_id];
        if (Object.keys(talent_data).includes('attributes')) {
          console.log(`talent ${talent_id} has attrs`)
          console.log(talent_data)
          for (let attribute_key of Object.keys(talent_data.attributes)) {
            let modifier_label = attribute_key;
            let modifier_data = talent_data.attributes[attribute_key];
            console.log("found AE data")
            console.log(modifier_data)
            if (active_effects.filter(i => i.label === modifier_label).length === 0) {
              // AE does not exist, create it
              let created = await parent_item.createEmbeddedDocuments("ActiveEffect", [{
                label: modifier_label,
                icon: "icons/svg/aura.svg",
                origin: parent_item.uuid,
                disabled: false,
                transfer: true,
              }]);
              for (const created_active_effect of created) {
                let link_ids = [
                  talent_data.link_id, // TODO: the specialization also needs a link ID, but this needs to be created on it first
                ];
                created_active_effect.setFlag('starwarsffg', 'link_ids', link_ids);
              }
            }
            // AE exists, update it
            await ModifierHelpers.updateActiveEffect(
                parent_item,
                modifier_label,
                modifier_data.modtype,
                modifier_data.mod,
                modifier_data.value,
            );
            touched_modifiers.push(modifier_label);
          }
        }
        console.log(touched_modifiers)
        active_effects.forEach(function (active_effect) {
          console.log(active_effect.label)
          let link_ids = active_effect.getFlag('starwarsffg', 'link_ids');
          console.log(link_ids)
          if (link_ids && link_ids.includes(talent_data.link_id) && !touched_modifiers.includes(active_effect.label)) {
            // this AE has been removed, delete it
            to_delete.push(active_effect.id);
          }
        });
      }
    }
    else if (['forcepower', 'signatureability'].includes(parent_item.type)) {
      for (const upgrade_id of Object.keys(parent_item.system?.upgrades)) {
        let upgrade_data = parent_item.system.upgrades[upgrade_id];
        if (Object.keys(upgrade_data).includes('attributes')) {
          console.log(`talent ${upgrade_id} has attrs`)
          console.log(upgrade_data)
          for (let attribute_key of Object.keys(upgrade_data.attributes)) {
            let modifier_label = attribute_key;
            let modifier_data = upgrade_data.attributes[attribute_key];
            console.log("found AE data")
            console.log(modifier_data)
            if (active_effects.filter(i => i.label === modifier_label).length === 0) {
              // AE does not exist, create it
              let created = await parent_item.createEmbeddedDocuments("ActiveEffect", [{
                label: modifier_label,
                icon: "icons/svg/aura.svg",
                origin: parent_item.uuid,
                disabled: false,
                transfer: true,
              }]);
              for (const created_active_effect of created) {
                let link_ids = [
                  upgrade_data.link_id, // TODO: the specialization also needs a link ID, but this needs to be created on it first
                ];
                created_active_effect.setFlag('starwarsffg', 'link_ids', link_ids);
              }
            }
            // AE exists, update it
            await ModifierHelpers.updateActiveEffect(
                parent_item,
                modifier_label,
                modifier_data.modtype,
                modifier_data.mod,
                modifier_data.value,
            );
            touched_modifiers.push(modifier_label);
          }
        }
        console.log(touched_modifiers)
        active_effects.forEach(function (active_effect) {
          console.log(active_effect.label)
          let link_ids = active_effect.getFlag('starwarsffg', 'link_ids');
          console.log(link_ids)
          if (link_ids && link_ids.includes(upgrade_data.link_id) && !touched_modifiers.includes(active_effect.label)) {
            // this AE has been removed, delete it
            to_delete.push(active_effect.id);
          }
        });
      }
    }

    console.log("deleting unused AEs")
    console.log(to_delete)
    await parent_item.deleteEmbeddedDocuments('ActiveEffect', to_delete);
  }

  static async createEmbeddedAttachment(parent_item, attachment_item, nonce) {
    console.log("creating/updating embedded attachment")
    let attachment_data = {
      'nonce': nonce, // used to tie active effects to this attachment
      'img': attachment_item['img'],
      'name': attachment_item['name'],
      'type': attachment_item['type'], // we display a temporary item so we must include attrs
      'system': { // this format is kept for ease of using the same template only
        'hardpoints': {
          'value': attachment_item['system']['hardpoints']['value'],
        },
        'rarity': {
          'value': attachment_item['system']['rarity']['value'],
          'isrestricted': attachment_item['system']['rarity']['isrestricted'],
        },
        'price': {
          'value': attachment_item['system']['price']['value'],
        },
        'renderedDesc': attachment_item['system']['renderedDesc'],
        'type': attachment_item['system']['type'],
        'installed_mods': attachment_item['system']['itemmodifier'],
        // we keep attributes because some mods are not fit for active effects
        'attributes': attachment_item['system']['attributes'],
      },
    };
    console.log("final update data")
    console.log(attachment_data)
    let item_type = attachment_item['type'];
    console.log(attachment_item)
    console.log(item_type)

    // get existing attachments
    let attachments = parent_item.system[item_type];
    // add our current item to the list
    attachments.push(attachment_data);

    // javascript sucks
    let update_data = {
      'system': {},
    };
    update_data['system'][item_type] = attachments
    await parent_item.update(update_data);
  }

  static async embedAttachment(parent_item, attachment_item) {
    let item_type = 'item_attachment';
    if (attachment_item.type !== item_type) {
      console.log("Refusing to create embedded attachment - attachment isn't an attachment")
      // we only attach attachments... duh!
      return;
    }
    if (parent_item.type in ['weapon']) {
      let nonce = attachment_item['nonce'];
      console.log(`existing attachment nonce: ${nonce}`)
      if (nonce === undefined) {
        // there isn't an existing nonce, instead generate one
        nonce = randomID();
      }
      let data = {
        'item_nonce': parent_item.id, // this is only set if the attachment is embedded on an item
        'nonce': nonce, // used to tie active effects to this attachment
        'img': attachment_item['img'],
        'name': attachment_item['name'],
        'type': attachment_item['type'], // we display a temporary item so we must include attrs
        'system': { // this format is kept for ease of using the same template only
          'hardpoints': {
            'value': attachment_item['system']['hardpoints']['value'],
          },
          'rarity': {
            'value': attachment_item['system']['rarity']['value'],
            'isrestricted': attachment_item['system']['rarity']['isrestricted'],
          },
          'price': {
            'value': attachment_item['system']['price']['value'],
          },
          'renderedDesc': attachment_item['system']['renderedDesc'],
          'type': attachment_item['system']['type'],
          // we keep attributes because some mods are not fit for active effects
          'attributes': attachment_item['system']['attributes'],
        },
      };
      console.log("final update data")
      console.log(data)
      // get existing attachments (excluding our current value)
      let attachments = parent_item.system[item_type].filter(
          i => i.nonce !== nonce
      );
      // add our current item to the list
      attachments.push(data);

      // javascript sucks
      let update_data = {
        'system': {},
      };
      update_data['system'][item_type] = attachments;
      await parent_item.update(update_data);

      // transfer the active effects
      await ItemHelpers.transferActiveEffects(attachment_item, parent_item);
    }
  }

  /**
   * Transfers active effects from one item to another, e.g. when an attachment is dropped onto a weapon
   * @param source_item Item the AEs are coming from
   * @param destination_item Item the AEs are being transferred to
   * @param link_id upstream ID used to identify the source item (used to remove AEs if the source item is removed)
   * @returns {Promise<void>}
   */
  static async transferActiveEffects(source_item, destination_item, link_id) {
    console.log(source_item)
    console.log(`looking for active effects on ${source_item.name}`)
    source_item.getEmbeddedCollection('ActiveEffect').contents.forEach(await async function (effect) {
      console.log(`...transferring ${effect.label}`)
      // create the effect on the destination item
      let results = await destination_item.createEmbeddedDocuments(
          'ActiveEffect',
          [{
            label: effect.label,
            icon: effect.icon,
            origin: destination_item.uuid, // update the source since the actor uses this
            disabled: effect.disabled,
            transfer: effect.transfer,
            changes: effect.changes,
          }]
      );
      console.log("done creating effects")
      console.log(results)

      // set a flag on the new version of the activeeffect, so we can track where it came from
      // note that Foundry does this for us, but it tracks the local item. we want to be able to remove it
      // if the attachment or mod data is removed
      console.log("setting flags")
      results.forEach(function (result) {
        let link_ids = effect.getFlag('starwarsffg', 'link_ids');
        if (!link_ids) {
          link_ids = [];
        }
        console.log(`found existing link Ids: ${link_ids}`)
        link_ids.push(link_id);
        console.log(`setting link ids: ${link_ids}`)
        result.setFlag('starwarsffg', 'link_ids', link_ids);
      });
      console.log("done setting flags")
    });
  }
}
