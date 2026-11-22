import ItemHelpers from "../helpers/item-helpers.js";
import ModifierHelpers from "../helpers/modifiers.js";

export class itemEditor extends FormApplication  {
  /*
  Known issues:
    - The title of the editor doesn't get updated when you update the name
    - Modification descriptions are rendered in an input field, not a rich text editor. I can't figure out how to get them to work in RTEs
    - Qualities added from an attachment do not get totaled if they are also already present on the weapon (e.g. a weapon with Pierce 2 and an attachment which adds Pierce 1)
  */
  constructor(data) {
    super();
    this.data = data;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(
      super.defaultOptions,
      {
        title: `Embedded Item Editor`, // should not be seen by anyone, as it is dynamically set on getData()
        //height: 720,
        width: 520,
        template: "systems/starwarsffg/templates/items/dialogs/ffg-embedded-itemattachment.html",
        closeOnSubmit: false,
        submitOnClose: true,
        submitOnChange: true,
        resizable: true,
        classes: ["starwarsffg", "flat_editor", "sheet"],
        tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "tab1"}],
        scrollY: [".modification_container"],
      }
    );
  }

  /** @override */
  get template() {
    const path = "systems/starwarsffg/templates/items/dialogs";
    return `${path}/ffg-embedded-${this.data.clickedObject.type}.html`;
  }

  /** @override */
  async getData(options) {
    // update the title since it isn't available when creating the application
    this.options.title = game.i18n.format("SWFFG.Items.Popout.Title", {currentItem: this.data.clickedObject.name, parentItem: this.data.sourceObject.name});
    const data = await this._enrichData();
    let modifierChoices = CONFIG.FFG.allowableModifierChoices;

    // add in custom skills from the actor, if present
    if (this.data.sourceObject?.actor?.system?.skills) {
      const updatedChoices = foundry.utils.deepClone(modifierChoices);
      for (const modifierChoice of Object.keys(modifierChoices).filter(i => i.indexOf("Skill") >= 0)) {
        updatedChoices[modifierChoice] = this.data.sourceObject?.actor?.system?.skills;
      }
      modifierChoices = updatedChoices;
    }

    const next = ModifierHelpers.nextModAttempt(data.clickedObject);
    const dice = await foundry.applications.ux.TextEditor.enrichHTML("[DI]".repeat(next.difficulty));
    const nextMod = game.i18n.format("SWFFG.Items.Popout.Label.NextMod", {dice, cost: next.cost});

    return {
      modifierTypes: CONFIG.FFG.allowableModifierTypes,
      modifierChoices: modifierChoices,
      slotStates: CONFIG.FFG.mod_slot_states,
      nextMod: nextMod,
      data: data,
    };
  }

  /**
   * retrieves data and converts rich text editor fields into the enriched version. this results in things like dice displaying
   * @returns {Promise<*>}
   * @private
   */
  async _enrichData() {
    let enriched = this.data;
    enriched.clickedObject.system.enrichedDescription = await foundry.applications.ux.TextEditor.enrichHTML(this.data.clickedObject.system.description);
    for (let modification of enriched.clickedObject.system.itemmodifier) {
      if (!Array.isArray(modification.system.slots)) {
        // a Modification from before slots: its rank was the slot count, so each slot is one rank
        modification.system.slots = ModifierHelpers.modSlots(modification);
        if (modification.system.rank) {
          modification.system.rank = 1;
        }
      }
      modification.system.enrichedDescription = await foundry.applications.ux.TextEditor.enrichHTML(modification.system.description);
    }
    return enriched;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('[name="system.type"]').on("change", this._updateType.bind(this));
    html.find(".flat_editor.dropdown").on("change", this._updateDropdown.bind(this));
    html.find(".flat_editor.add-mod").on("click", this._modControl.bind(this));
    html.find(".flat_editor.add-modification").on("click", this._modificationControl.bind(this));

    // allow drag-and-dropping mods if this is an attachment
    if (this.data.clickedObject.type === "itemattachment") {
      const dragDrop = new foundry.applications.ux.DragDrop({
        dragSelector: ".item",
        dropSelector: ".starwarsffg.flat_editor",
        permissions: { dragstart: this._canDragStart.bind(this), drop: this._canDragDrop.bind(this) },
        callbacks: { drop: this.onDropMod.bind(this) },
      });
      dragDrop.bind($(`[data-appid="${this.appId}"]`)[0]);
    }
  }

  async onDropMod(event) {
    CONFIG.logger.debug("caught mod drag-and-drop");
    if (this.data.clickedObject.type !== "itemattachment") {
      ui.notifications.info("You can only drag-and-drop mods onto attachments.");
      return;
    }

    let data;
    const specialization = this.object;
    const li = event.currentTarget;
    const talentId = $(li).attr("id");

    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (data.type !== "Item") return;
    } catch (err) {
      return false;
    }

    const droppedObject = await fromUuid(data.uuid);

    // if it's an attachment, locate the attachment to update
    let updateData;
    if (this.data.clickedObject.type === "itemattachment") {
      updateData = this.data.sourceObject.system.itemattachment;
      for (let attachment of updateData) {
        if (attachment._id === this.data.clickedObject._id) {
          // update the local object so we can see the update in the editor
          this.data.clickedObject.system.itemmodifier.push(droppedObject.toObject());
        }
      }
      await this.data.sourceObject.update({system: {itemattachment: updateData}});
      this.render(true);
    }
  }

  /**
   * Controls creating, deleting, or modifying mods (which contain modifiers)
   * @param event
   */
  async _modControl(event) {
    let action = event.currentTarget.getAttribute('data-action');
    if (action === 'create') {
      const nk = new Date().getTime();
      const modifierTypes = CONFIG.FFG.allowableModifierTypes;
      const modifierChoices = CONFIG.FFG.allowableModifierChoices;
      const modificationId = $(event.currentTarget).data("modification-id");
      let direct = this.data.clickedObject.type !== "itemattachment";
      if (modificationId === undefined) {
        // we aren't adding it to a modification, so this is true
        direct = true;
      }

      CONFIG.logger.debug(`caught creating a new mod on an attachment. data: ${modificationId}, ${direct}`);
      CONFIG.logger.debug(modifierTypes);
      CONFIG.logger.debug(modifierChoices);
      CONFIG.logger.debug(`expected new modtype is ${Object.keys(modifierTypes)[0]}`);
      CONFIG.logger.debug(`expected new mod mod is ${modifierChoices[Object.keys(modifierTypes)[0]]}`);

      let rendered = await foundry.applications.handlebars.renderTemplate(
        'systems/starwarsffg/templates/items/dialogs/ffg-mod.html',
        {
          modifierTypes: modifierTypes,
          modifierChoices: modifierChoices,
          direct: direct,
          number: modificationId,
          attachmentType: this.data.clickedObject.system.type,
          id: `attr${nk}`,
          attr: {
            modtype: Object.keys(CONFIG.FFG.allowableModifierTypes)[0],
            mod: Object.keys(CONFIG.FFG.allowableModifierChoices[Object.keys(CONFIG.FFG.allowableModifierTypes)[0]])[0],
            value: 1,
          },
        }
      );

      $(event.currentTarget).parent().parent().children(".attributes-list").append(rendered);
      // update the listeners, so we catch events on these new entries
      this.activateListeners($(event.currentTarget).parent().parent().children(".attributes-list"));
      // submit the changes so it gets saved even if the user reloads without closing the editor
      await this._updateObject(undefined, this._getSubmitData());
    } else if (action === 'delete') {
      const modContainer = $(event.currentTarget).parents(".modification_title").find(".attributes-list");
      for (const mod of modContainer.children()) {
        const modId = $(mod).data("attribute");
        const match = this.data.sourceObject.effects.find(i => i.name === modId);
        if (match) {
          CONFIG.logger.debug(`Detected mod present on removed modification, deleting active effect added by ${modId}`);
          await this.data.sourceObject.deleteEmbeddedDocuments("ActiveEffect", [match.id]);
        }
      }
      $(event.currentTarget).parent().remove();
      // submit the changes so it gets saved even if the user reloads without closing the editor
      await this._updateObject(undefined, this._getSubmitData());
    }
  }

  /**
   * Controls creating, deleting, or modifying modifications (which go on attachments)
   * @param event
   */
  async _modificationControl(event) {
    if(this.actor && !this.data.sourceObject.parent?.verifyEditModeIsNotEnabled()) return;

    let action = event.currentTarget.getAttribute('data-action');
    if (action === 'create') {
      const modTypeChoices = CONFIG.FFG.allowableModifierTypes;
      const modChoices = CONFIG.FFG.allowableModifierChoices;
      let rendered = await foundry.applications.handlebars.renderTemplate(
        'systems/starwarsffg/templates/items/dialogs/ffg-modification.html',
        {
          modTypeChoices: modTypeChoices,
          modChoices: modChoices,
          direct: true,
          slotStates: CONFIG.FFG.mod_slot_states,
          mod: {
            name: "New Modification",
            system: {
              description: "Placeholder description",
              active: false,
              slots: ["unmodified"],
              rank: 0,
              attribute: {},
            },
          },
        }
      );
      $(event.currentTarget).parent().children('.modification_container').append(rendered);
      // update the listeners, so we catch events on these new entries
      this.activateListeners($(event.currentTarget).parent().children('.modification_container'));
      // submit the changes so it gets saved even if the user reloads without closing the editor
      await this._updateObject(undefined, this._getSubmitData());
    } else if (action === 'delete') {
      const modContainer = $(event.currentTarget).parents(".modification_title").find(".attributes-list");
      for (const mod of modContainer.children()) {
        const modId = $(mod).data("attribute");
        const match = this.data.sourceObject.effects.find(i => i.name === modId);
        if (match) {
          CONFIG.logger.debug(`Detected mod present on removed modification, deleting active effect added by ${modId}`);
          await this.data.sourceObject.deleteEmbeddedDocuments("ActiveEffect", [match.id]);
        }
      }
      $(event.currentTarget).parent().parent().remove();
      // submit the changes so it gets saved even if the user reloads without closing the editor
      await this._updateObject(undefined, this._getSubmitData());
    }
  }

  /**
   * When an attachment or mod type is changed, update the dropdown choices
   * @param event
   * @returns {Promise<void>}
   */
  async _updateType(event) {
    // update our local record of which "attachmentType" we're on so dropdowns render correctly
    this.data.clickedObject.system.type = event.currentTarget.value;
    // iterate over mods and update the modifier to be the first choice of the first modifierType
    // this is done because the selected modifier type changes when the "attachmentType" is changed
    for (let mod of Object.keys(this.data.clickedObject.system.attributes)) {
      this.data.clickedObject.system.attributes[mod].modtype = Object.values(CONFIG.FFG.allowableModifierTypes[event.currentTarget.value])[0].value;
      this.data.clickedObject.system.attributes[mod].mod = Object.values(CONFIG.FFG.allowableModifierTypes[Object.values(CONFIG.FFG.allowableModifierTypes[event.currentTarget.value])[0].value])[0].value;
    }

    // if the item is an attachment, we also need to update mods on modifications
    if (this.data.clickedObject.type === "itemattachment") {
      for (let modifier of Object.keys(this.data.clickedObject.system.itemmodifier)) {
        // modifiers sometimes don't have the attributes in them...
        if (Object.keys(this.data.clickedObject.system.itemmodifier[modifier].system).includes("attributes")) {
          for (let mod of Object.keys(this.data.clickedObject.system.itemmodifier[modifier].system.attributes)) {
            this.data.clickedObject.system.itemmodifier[modifier].system.attributes[mod].modtype = Object.values(CONFIG.FFG.allowableModifierTypes[event.currentTarget.value])[0].value;
            this.data.clickedObject.system.itemmodifier[modifier].system.attributes[mod].mod = Object.values(CONFIG.FFG.allowableModifierTypes[Object.values(CONFIG.FFG.allowableModifierTypes[event.currentTarget.value])[0].value])[0].value;
          }
        }
      }
    }

    // re-render the form so we see the updated dropdown selections/options
    this.render(true);
  }

  /**
   * Updates the modifier 2nd level selector when the 1st level is updated
   * @param event "change" event
   */
  async _updateDropdown(event) {
    // TODO: I think the handlebars select helper can be used here, basically to remove most of this function
    let new_value = event.currentTarget.value;
    let dropdown = event.currentTarget.getAttribute('data-type');

    if (dropdown === 'modtype') {
      let new_html = '';
      let chosen_config = CONFIG.FFG.allowableModifierChoices[new_value];
      Object.keys(chosen_config).forEach(function (choice) {
        new_html += `<option value="${chosen_config[choice]['value']}">${game.i18n.localize(chosen_config[choice]['label'])}</option>`
      });
      $(event.currentTarget).parent().find(".flat_editor.dropdown.mod").html(new_html);

      // swap the value input between checkbox and number based on modtype
      const valueName = event.currentTarget.name.replace(/\.modtype$/, '.value');
      const $valueInput = $(event.currentTarget).parent().find(".modvalue");
      if (new_value === "Career Skill") {
        $valueInput.replaceWith(`<input name="${valueName}" type="checkbox" class="modvalue" data-attr-id="${$valueInput.data('attr-id')}">`);
      } else if ($valueInput.attr('type') === 'checkbox') {
        $valueInput.replaceWith(`<input name="${valueName}" type="number" class="modvalue" value="0" data-attr-id="${$valueInput.data('attr-id')}">`);
      }
    }
  }

  /** @override */
  async _updateObject(event, formData) {
    formData = ItemHelpers.explodeFormData(formData);
    const equipped = this.data.sourceObject.system?.equippable?.equipped;

    // removing all itemmodifiers removes them from the form entirely; add them back in as an empty array
    if (!Object.keys(formData.system).includes("itemmodifier")) {
      formData.system.itemmodifier = [];
    }

    // removing all base mods removes them from the form entirely; add back an empty dic (for our deletion keys)
    if (!Object.keys(formData.system).includes("attributes")) {
      formData.system.attributes = {};
    }

    const existingActiveEffects = this.data.sourceObject.getEmbeddedCollection("ActiveEffect");

    // if it's an attachment, locate the attachment to update
    let updateData;
    if (this.data.clickedObject.type === "itemattachment") {
      CONFIG.logger.debug("> Detected item type of itemattachment");
      updateData = this.data.sourceObject.system.itemattachment;
      for (let attachment of updateData) {
        if (attachment._id === this.data.clickedObject._id) {
          CONFIG.logger.debug(`>> Found relevant attachment: ${attachment.name} / ${attachment.id}, looking for removed keys`);
          // iterate over the mods on the existing attachment and remove them if they are not present in the new data
          for (let modKey of Object.keys(attachment.system.attributes)) {
            if (!Object.keys(formData.system.attributes).includes(modKey)) {
              CONFIG.logger.debug(`>> Detected key ${modKey} was removed, attempting to locate matching active effect`);
              formData.system.attributes[`-=${modKey}`] = null;
              delete attachment.system.attributes[modKey];
              // delete the active effect
              const match = existingActiveEffects.find(i => i.name === modKey);
              if (match) {
               CONFIG.logger.debug(`>>> Active effect located (${match.id}), deleting`);
                await this.data.sourceObject.deleteEmbeddedDocuments("ActiveEffect", [match.id]);
              }
            }
          }
          CONFIG.logger.debug(">> Looking for new or updated ");
          if (Object.keys(formData.system).includes("attributes")) {
            for (const modKey of Object.keys(formData.system.attributes)) {
              CONFIG.logger.debug(">>> Checking modKey", modKey);
              if (modKey.startsWith("-=")) {
                CONFIG.logger.debug(`>>>> Skipping mod ${modKey} which will be deleted`);
                // skip anything queued for deletion
                continue;
              }
              const match = existingActiveEffects.find(i => i.name === modKey);
              const explodedMods = ModifierHelpers.explodeMod(
                formData.system.attributes[modKey].modtype,
                formData.system.attributes[modKey].mod
              );

              const changes = [];
              for (const curMod of explodedMods) {
                changes.push({
                  key: ModifierHelpers.getModKeyPath(curMod['modType'], curMod['mod']),
                  mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                  value: formData.system.attributes[modKey].value,
                });
              }

              if (match) {
                // existing entry
                CONFIG.logger.debug(`>>>> Staged AE changes for update: ${JSON.stringify(changes)}`);
                await match.update({
                  changes: changes,
                  disabled: !equipped,
                });
              } else {
                // new entry
                const effect = {
                  name: modKey,
                  changes: changes,
                  disabled: !equipped,
                };
                CONFIG.logger.debug(`>>>> Staged AE for creation: ${JSON.stringify(effect)}`);
                await this.data.sourceObject.createEmbeddedDocuments("ActiveEffect", [effect]);
              }
            }
          }

          // repeat the process, but this time for mods on modifications on the attachment
          CONFIG.logger.debug(">> checking modifications...");
          if (Object.keys(formData.system).includes("itemmodifier")) {
            for (const modifier of Object.values(formData.system.itemmodifier)) {
              // the form carries no type, and the rank totals rely on it (#2377)
              modifier.type = "itemmodifier";
              // one slot per attempt allowed, new ones unmodified; installed while any slot is
              const attempts = Math.max(parseInt(modifier.system.attempts, 10) || 1, 1);
              const slots = Object.values(modifier.system.slots ?? {});
              modifier.system.slots = Array.from({length: attempts}, (_, i) => slots[i] ?? "unmodified");
              modifier.system.active = modifier.system.slots.includes("modified");
              delete modifier.system.attempts;
              if (!Object.keys(modifier.system).includes("attributes")) {
                // skip anything that doesn't have attributes
                CONFIG.logger.debug(`>>> modification ${modifier.name} has no mods, skipping further processing`);
                continue;
              }

              for (const modKey of Object.keys(modifier.system.attributes)) {
                CONFIG.logger.debug(">>> Checking modKey", modKey);
                if (modKey.startsWith("-=")) {
                  CONFIG.logger.debug(`>>>> Skipping mod ${modKey} which will be deleted`);
                  // skip anything queued for deletion
                  continue;
                }


                const match = existingActiveEffects.find(i => i.name === modKey);
                const explodedMods = ModifierHelpers.explodeMod(
                  modifier.system.attributes[modKey].modtype,
                  modifier.system.attributes[modKey].mod
                );

                const changes = [];
                for (const curMod of explodedMods) {
                  changes.push({
                    key: ModifierHelpers.getModKeyPath(curMod['modType'], curMod['mod']),
                    mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                    value: modifier.system.attributes[modKey].value,
                  });
                }

                let disabled;
                if (modifier.system.active === equipped) {
                  // if they're both enabled or disabled, use the opposite value
                  disabled = !modifier.system.active;
                } else {
                  // if either is not enabled, disable the active effect
                  disabled = true;
                }

                if (match) {
                  // existing entry
                  CONFIG.logger.debug(`>>>> Staged AE changes for update: ${JSON.stringify(changes)}`);
                  await match.update({
                    changes: changes,
                    disabled: disabled,
                  });
                } else {
                  // new entry
                  const effect = {
                    name: modKey,
                    disabled: disabled,
                    changes: changes,
                  };
                  CONFIG.logger.debug(`>>>> Staged AE for creation: ${JSON.stringify(effect)}`);
                  await this.data.sourceObject.createEmbeddedDocuments("ActiveEffect", [effect]);
                }
              }
            }
          }

          // merge the existing data in so we end up with all fields present
          attachment = foundry.utils.mergeObject(
            attachment,
            formData,
          );
          // pull the updated data back into our local record of what it should look like
          this.data.clickedObject = attachment;
        }
      }
      await this.data.sourceObject.update({system: {itemattachment: updateData}});
      // the effects above hold one rank's worth; scale them to each Modification's rank
      await ItemHelpers.syncAEStatus(this.data.sourceObject, existingActiveEffects);
    }

    // if it's a mod, locate the mod to update
    if (this.data.clickedObject.type === "itemmodifier") {
      updateData = this.data.sourceObject.system.itemmodifier;
      for (let modifier of updateData) {
        // select based on names instead of IDs, as IDs are not present here
        if (modifier.name === this.data.clickedObject.name) {
          // iterate over the mods on the existing item and remove them if they are not present in the new data
          for (let modKey of Object.keys(modifier.system.attributes)) {
            if (!Object.keys(formData.system.attributes).includes(modKey)) {
              formData.system.attributes[`-=${modKey}`] = null;
              delete modifier.system.attributes[modKey];
              // delete the active effect
              const match = existingActiveEffects.find(i => i.name === modKey);
              if (match) {
                CONFIG.logger.debug(`>>> Active effect located (${match.id}), deleting`);
                await this.data.sourceObject.deleteEmbeddedDocuments("ActiveEffect", [match.id]);
              }
            }
          }
          // merge the existing data in so we end up with all fields present
          modifier = foundry.utils.mergeObject(
            modifier,
            formData,
          );
          // pull the updated data back into our local record of what it should look like
          this.data.clickedObject = modifier;
        }
      }

      // iterate over the submitted data to find new/updated entries
      for (const modKey of Object.keys(formData.system.attributes)) {
        if (modKey.startsWith("-=")) {
          continue;
        }

        const match = existingActiveEffects.find(i => i.name === modKey);
        const explodedMods = ModifierHelpers.explodeMod(
          formData.system.attributes[modKey].modtype,
          formData.system.attributes[modKey].mod
        );

        const changes = [];
        for (const curMod of explodedMods) {
          changes.push({
            key: ModifierHelpers.getModKeyPath(curMod['modType'], curMod['mod']),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: formData.system.attributes[modKey].value,
          });
        }

        if (match) {
          // existing entry
          CONFIG.logger.debug(`>>>> Staged AE changes for update: ${JSON.stringify(changes)}`);
          await match.update({
            changes: changes,
            disabled: !equipped,
          });
        } else {
          // new entry
          const effect = {
            name: modKey,
            changes: changes,
            disabled: !equipped,
          };
          CONFIG.logger.debug(`>>>> Staged AE for creation: ${JSON.stringify(effect)}`);
          await this.data.sourceObject.createEmbeddedDocuments("ActiveEffect", [effect]);
        }
      }
      await this.data.sourceObject.update({system: {itemmodifier: updateData}});
    }
    // needed to re-render the mod form (as the input can change types based on the selected modType)
    this.render(true)
  }
}

export class talentEditor extends itemEditor {
  /*
    Known issues:
    - The description rich text editor doesn't appear to work
  */
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(
      super.defaultOptions,
      {
        title: `Embedded Talent Editor`, // should not be seen by anyone, as it is dynamically set on getData()
        //height: 720,
        width: 520,
        closeOnSubmit: false,
        submitOnClose: true,
        submitOnChange: true,
        resizable: true,
        classes: ["starwarsffg", "flat_editor"],
        tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "tab1"}],
        scrollY: [".modification_container"],
      }
    );
  }

  /** @override */
  get template() {
    const path = "systems/starwarsffg/templates/items/dialogs";
    return `${path}/ffg-embedded-talent.html`;
  }

    /** @override */
  async getData(options) {
    // update the title since it isn't available when creating the application
    this.options.title = game.i18n.format("SWFFG.Items.Popout.Title", {currentItem: this.data.clickedObject.name, parentItem: this.data.sourceObject.name});

    let activations = CONFIG.FFG.activations;
    let data = await this._enrichData();

    // add in custom skills from the actor, if present
    if (this.data.sourceObject?.actor?.system?.skills) {
      const updatedChoices = foundry.utils.deepClone(data.modifierChoices);
      for (const modifierChoice of Object.keys(CONFIG.FFG.allowableModifierChoices).filter(i => i.indexOf("Skill") >= 0)) {
        updatedChoices[modifierChoice] = this.data.sourceObject?.actor?.system?.skills;
      }
      data.modifierChoices = updatedChoices;
    }

    return {
      activations: activations,
      data: data,
    };
  }

  /**
   * Controls creating, deleting, or modifying mods (which contain modifiers)
   * @param event
   */
  async _modControl(event) {
    if(this.actor && !this.data.sourceObject.parent?.verifyEditModeIsNotEnabled()) return;

    let action = event.currentTarget.getAttribute('data-action');
    if (action === 'create') {
      const nk = new Date().getTime();
      const modifierTypes = CONFIG.FFG.allowableModifierTypes;
      const modifierChoices = CONFIG.FFG.allowableModifierChoices;
      const modificationId = $(event.currentTarget).data("modification-id");
      const direct = this.data.clickedObject.type !== "itemattachment";

      CONFIG.logger.debug(`caught creating a new mod on a talent. data: ${modificationId}, ${direct}`);
      CONFIG.logger.debug(modifierTypes);
      CONFIG.logger.debug(modifierChoices);
      CONFIG.logger.debug(`expected new modtype is ${Object.keys(modifierTypes)[0]}`);
      CONFIG.logger.debug(`expected new mod mod is ${modifierChoices[Object.keys(modifierTypes)[0]]}`);

      let rendered = await foundry.applications.handlebars.renderTemplate(
        'systems/starwarsffg/templates/items/dialogs/ffg-mod.html',
        { // TODO: this should probably be a new item of the correct type so it assumes any changes to the data model automatically
          modifierTypes: modifierTypes,
          modifierChoices: modifierChoices,
          direct: direct,
          number: modificationId,
          attachmentType: 'all',
          id: `attr${nk}`,
          attr: {
            modtype: Object.keys(CONFIG.FFG.allowableModifierTypes)[0],
            mod: Object.keys(CONFIG.FFG.allowableModifierChoices[Object.keys(CONFIG.FFG.allowableModifierTypes)[0]])[0],
            value: 1,
          },
        }
      );

      $(event.currentTarget).parent().parent().children(".attributes-list").append(rendered);
      // update the listeners, so we catch events on these new entries
      this.activateListeners($(event.currentTarget).parent().parent().children(".attributes-list"));
      // submit the changes so it gets saved even if the user reloads without closing the editor
      await this._updateObject(undefined, this._getSubmitData());
    } else if (action === 'delete') {
      $(event.currentTarget).parent().remove();
      // submit the changes so it gets saved even if the user reloads without closing the editor
      await this._updateObject(undefined, this._getSubmitData());
    }
  }

  /**
   * retrieves data and converts rich text editor fields into the enriched version. this results in things like dice displaying
   * @returns {Promise<*>}
   * @private
   */
  async _enrichData() {
    let enriched = this.data;
    enriched.clickedObject.enrichedDescription = await foundry.applications.ux.TextEditor.enrichHTML(this.data.clickedObject.description);
    return enriched;
  }

  /** @override */
  async _updateObject(event, formData) {
    if(this.actor && !this.data.sourceObject.parent?.verifyEditModeIsNotEnabled()) return;

    CONFIG.logger.debug("Updating talent");
    formData = foundry.utils.expandObject(formData);

    // update the activation label to match the activation
    formData.activationLabel = CONFIG.FFG.activations[formData.activation].label;

    // move attributes out of "system" since they aren't here for talents
    formData.attributes = formData.system?.attributes;
    delete formData.system?.attributes;
    // make sure attributes is a dictionary instead of whatever they end up being
    if (!Object.keys(formData).includes("attributes") || formData.attributes === undefined) {
      formData.attributes = {};
    }

    const existingActiveEffects = this.data.sourceObject.getEmbeddedCollection("ActiveEffect");

    // iterate over attributes on the specialization and remove any that aren't present in the form
    if (Object.keys(this.data.sourceObject.system.talents[this.data.talentId]).includes("attributes") && this.data.sourceObject.system.talents[this.data.talentId].attributes !== undefined) {
      for (const attrKey of Object.keys(this.data.sourceObject.system.talents[this.data.talentId].attributes)) {
        if (!Object.keys(formData.attributes).includes(attrKey)) {
          formData.attributes[`-=${attrKey}`] = null;
          delete this.data.sourceObject.system.attributes[attrKey];
          // delete the active effect
          const match = existingActiveEffects.find(i => i.name === attrKey);
          if (match) {
            CONFIG.logger.debug(`>>> Active effect located (${match.id}), deleting`);
            await this.data.sourceObject.deleteEmbeddedDocuments("ActiveEffect", [match.id]);
          }
        }
      }
    }

    CONFIG.logger.debug(">> Looking for new or updated ");
    // iterate over newly added or updated attributes and create the active effects
    if (Object.keys(formData).includes("attributes")) {
      for (const modKey of Object.keys(formData.attributes)) {
        CONFIG.logger.debug(">>> Checking modKey", modKey);
        if (modKey.startsWith("-=")) {
          CONFIG.logger.debug(`>>>> Skipping mod ${modKey} which will be deleted`);
          // skip anything queued for deletion
          continue;
        }

        const match = existingActiveEffects.find(i => i.name === modKey);
        const explodedMods = ModifierHelpers.explodeMod(
          formData.attributes[modKey].modtype,
          formData.attributes[modKey].mod
        );

        const changes = [];
        for (const curMod of explodedMods) {
          changes.push({
            key: ModifierHelpers.getModKeyPath(curMod['modType'], curMod['mod']),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: formData.attributes[modKey].value,
          });
        }

        if (match) {
          // existing entry
          CONFIG.logger.debug(`>>>> Staged AE changes for update: ${JSON.stringify(changes)}`);
          await match.update({
            changes: changes,
            disabled: !this.data.clickedObject.islearned,
          });
        } else {
          // new entry
          const effect = {
            name: modKey,
            changes: changes,
            disabled: !this.data.clickedObject.islearned,
          };
          CONFIG.logger.debug(`>>>> Staged AE for creation: ${JSON.stringify(effect)}`);
          await this.data.sourceObject.createEmbeddedDocuments("ActiveEffect", [effect]);
        }
      }
    }

    // merge it into the existing talent data
    formData = foundry.utils.mergeObject(
      this.data.sourceObject.system.talents[this.data.talentId],
      formData,
    );

    CONFIG.logger.debug(formData);

    await this.data.sourceObject.update({
      system: {
        talents: {
          [this.data.talentId]: formData,
        },
      },
    });
  }
}

export class forcePowerEditor extends itemEditor {
  /*
    Known issues:
    - The description rich text editor doesn't appear to work
  */
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(
      super.defaultOptions,
      {
        title: `Embedded Force Power Editor`, // should not be seen by anyone, as it is dynamically set on getData()
        //height: 720,
        width: 520,
        closeOnSubmit: false,
        submitOnClose: true,
        submitOnChange: true,
        resizable: true,
        classes: ["starwarsffg", "flat_editor"],
        tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "tab1"}],
        scrollY: [".modification_container"],
      }
    );
  }

  /** @override */
  get template() {
    const path = "systems/starwarsffg/templates/items/dialogs";
    return `${path}/ffg-embedded-upgrade.html`;
  }

    /** @override */
  async getData(options) {
    // update the title since it isn't available when creating the application
    this.options.title = game.i18n.format("SWFFG.Items.Popout.Title", {currentItem: this.data.clickedObject.name, parentItem: this.data.sourceObject.name});

    // build out the mod type and mod choices
    let modTypeChoices = CONFIG.FFG.allowableModifierTypes;
    let modChoices = CONFIG.FFG.allowableModifierChoices;
    let activations = CONFIG.FFG.activations;
    let data = await this._enrichData();

    let modifierChoices = CONFIG.FFG.allowableModifierChoices;

    // add in custom skills from the actor, if present
    if (this.data.sourceObject?.actor?.system?.skills) {
      const updatedChoices = foundry.utils.deepClone(modifierChoices);
      for (const modifierChoice of Object.keys(modifierChoices).filter(i => i.indexOf("Skill") >= 0)) {
        updatedChoices[modifierChoice] = this.data.sourceObject?.actor?.system?.skills;
      }
      data.modifierChoices = updatedChoices;
    }

    return {
      modTypeChoices: modTypeChoices,
      modChoices: modChoices,
      activations: activations,
      data: data,
    };
  }

  /**
   * Controls creating, deleting, or modifying mods (which contain modifiers)
   * @param event
   */
  async _modControl(event) {
    let action = event.currentTarget.getAttribute('data-action');
    if (action === 'create') {
      const nk = new Date().getTime();
      const modifierTypes = CONFIG.FFG.allowableModifierTypes;
      const modifierChoices = CONFIG.FFG.allowableModifierChoices;
      const modificationId = $(event.currentTarget).data("modification-id");
      const direct = this.data.clickedObject.type !== "itemattachment";

      CONFIG.logger.debug(`caught creating a new mod on an upgrade. data: ${modificationId}, ${direct}`);
      CONFIG.logger.debug(modifierTypes);
      CONFIG.logger.debug(modifierChoices);
      CONFIG.logger.debug(`expected new modtype is ${Object.keys(modifierTypes)[0]}`);
      CONFIG.logger.debug(`expected new mod mod is ${modifierChoices[Object.keys(modifierTypes)[0]]}`);

      let rendered = await foundry.applications.handlebars.renderTemplate(
        'systems/starwarsffg/templates/items/dialogs/ffg-mod.html',
        {
          modifierTypes: modifierTypes,
          modifierChoices: modifierChoices,
          direct: direct,
          number: modificationId,
          attachmentType: 'all',
          id: `attr${nk}`,
          attr: {
            modtype: Object.keys(CONFIG.FFG.allowableModifierTypes)[0],
            mod: Object.keys(CONFIG.FFG.allowableModifierChoices[Object.keys(CONFIG.FFG.allowableModifierTypes)[0]])[0],
            value: 1,
          },
        }
      );

      $(event.currentTarget).parent().parent().children(".attributes-list").append(rendered);
      // update the listeners, so we catch events on these new entries
      this.activateListeners($(event.currentTarget).parent().parent().children(".attributes-list"));
      // submit the changes so it gets saved even if the user reloads without closing the editor
      await this._updateObject(undefined, this._getSubmitData());
    } else if (action === 'delete') {
      $(event.currentTarget).parent().remove();
      // submit the changes so it gets saved even if the user reloads without closing the editor
      await this._updateObject(undefined, this._getSubmitData());
    }
  }

  /**
   * retrieves data and converts rich text editor fields into the enriched version. this results in things like dice displaying
   * @returns {Promise<*>}
   * @private
   */
  async _enrichData() {
    let enriched = this.data;
    enriched.clickedObject.enrichedDescription = await foundry.applications.ux.TextEditor.enrichHTML(this.data.clickedObject.description);
    return enriched;
  }

  /** @override */
  async _updateObject(event, formData) {
    CONFIG.logger.debug("Updating upgrade");
    formData = foundry.utils.expandObject(formData);

    // move attributes out of "system" since they aren't here for upgrades
    formData.attributes = formData.system?.attributes;
    delete formData.system?.attributes;
    // make sure attributes is a dictionary instead of whatever they end up being
    if (!Object.keys(formData).includes("attributes") || formData.attributes === undefined) {
      formData.attributes = {};
    }

    const existingActiveEffects = this.data.sourceObject.getEmbeddedCollection("ActiveEffect");

    // iterate over attributes on the specialization and remove any that aren't present in the form
    if (Object.keys(this.data.sourceObject.system.upgrades[this.data.upgradeId]).includes("attributes") && this.data.sourceObject.system.upgrades[this.data.upgradeId].attributes !== undefined) {
      for (const attrKey of Object.keys(this.data.sourceObject.system.upgrades[this.data.upgradeId].attributes)) {
        if (!Object.keys(formData.attributes).includes(attrKey)) {
          formData.attributes[`-=${attrKey}`] = null;
          delete this.data.sourceObject.system.attributes[attrKey];
          // delete the active effect
          const match = existingActiveEffects.find(i => i.name === attrKey);
          if (match) {
            CONFIG.logger.debug(`>>> Active effect located (${match.id}), deleting`);
            await this.data.sourceObject.deleteEmbeddedDocuments("ActiveEffect", [match.id]);
          }
        }
      }
    }

    CONFIG.logger.debug(">> Looking for new or updated ");
    // iterate over newly added or updated attributes and create the active effects
    if (Object.keys(formData).includes("attributes")) {
      for (const modKey of Object.keys(formData.attributes)) {
        CONFIG.logger.debug(">>> Checking modKey", modKey);
        if (modKey.startsWith("-=")) {
          CONFIG.logger.debug(`>>>> Skipping mod ${modKey} which will be deleted`);
          // skip anything queued for deletion
          continue;
        }

        const match = existingActiveEffects.find(i => i.name === modKey);
        const explodedMods = ModifierHelpers.explodeMod(
          formData.attributes[modKey].modtype,
          formData.attributes[modKey].mod
        );

        const changes = [];
        for (const curMod of explodedMods) {
          changes.push({
            key: ModifierHelpers.getModKeyPath(curMod['modType'], curMod['mod']),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: formData.attributes[modKey].value,
          });
        }

        if (match) {
          // existing entry
          CONFIG.logger.debug(`>>>> Staged AE changes for update: ${JSON.stringify(changes)}`);
          await match.update({
            changes: changes,
            disabled: !this.data.clickedObject.islearned,
          });
        } else {
          // new entry
          const effect = {
            name: modKey,
            changes: changes,
            disabled: !this.data.clickedObject.islearned,
          };
          CONFIG.logger.debug(`>>>> Staged AE for creation: ${JSON.stringify(effect)}`);
          await this.data.sourceObject.createEmbeddedDocuments("ActiveEffect", [effect]);
        }
      }
    }


    // merge it into the existing upgrade data
    formData = foundry.utils.mergeObject(
      this.data.sourceObject.system.upgrades[this.data.upgradeId],
      formData,
    );

    CONFIG.logger.debug(formData);

    await this.data.sourceObject.update({
      system: {
        upgrades: {
          [this.data.upgradeId]: formData,
        },
      },
    });
  }
}

/**
 * Edits the Modifications of an attachment which is its own document (as opposed to one embedded in an item)
 */
export class attachmentModificationsEditor extends itemEditor {
  constructor(attachment) {
    super({sourceObject: attachment, clickedObject: attachment.toObject()});
    // pick up mods dropped onto the sheet while this is open, so a submit does not drop them again
    this._updateHook = Hooks.on("updateItem", (item) => {
      if (item.uuid === attachment.uuid) this.render(false);
    });
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      tabs: [{navSelector: ".tabs", contentSelector: ".content", initial: "modifications"}],
    });
  }

  /** @override */
  get template() {
    return "systems/starwarsffg/templates/items/dialogs/ffg-attachment-modifications.html";
  }

  /** @override */
  async getData(options) {
    this.data.clickedObject = this.data.sourceObject.toObject();
    const data = await super.getData(options);
    this.options.title = game.i18n.format("SWFFG.Items.Popout.ModificationsTitle", {item: this.data.sourceObject.name});
    return data;
  }

  /** @override */
  async onDropMod(event) {
    // the sheet already knows how to take a dropped mod
    return this.data.sourceObject.sheet._onDropItem(event);
  }

  /** @override */
  async _updateObject(event, formData) {
    const attachment = this.data.sourceObject;
    if (!attachment.sheet.isEditable) return;
    if (attachment.actor && !attachment.actor.verifyEditModeIsNotEnabled()) return;

    const previous = attachment.toObject().system.itemmodifier;
    const expanded = foundry.utils.expandObject(formData);
    const modifications = [];
    for (const [key, form] of Object.entries(expanded.system ?? {})) {
      // a Modification added since the last render has no index yet
      const index = key.match(/^itemmodifier\[(\d*)\]$/)?.[1];
      if (index === undefined) continue;
      const {attempts, slots, attributes, ...fields} = form.system ?? {};
      const modification = foundry.utils.mergeObject(
        previous[parseInt(index, 10)] ?? {}, {...form, system: fields}, {inplace: false});
      modification.type = "itemmodifier";
      modification.system.attributes = attributes ?? {};
      // one slot per attempt allowed, new ones unmodified; installed while any slot is
      const count = Math.max(parseInt(attempts, 10) || 1, 1);
      const states = Object.values(slots ?? {});
      modification.system.slots = Array.from({length: count}, (_, i) => states[i] ?? "unmodified");
      modification.system.active = modification.system.slots.includes("modified");
      modifications.push(modification);
    }

    // each Modification's mods are effects on the attachment, live only while it is installed
    const effects = attachment.getEmbeddedCollection("ActiveEffect");
    const kept = new Set(Object.keys(attachment.system.attributes ?? {}));
    for (const modification of modifications) {
      for (const [modKey, attr] of Object.entries(modification.system.attributes)) {
        kept.add(modKey);
        const changes = ModifierHelpers.explodeMod(attr.modtype, attr.mod).map((curMod) => ({
          key: ModifierHelpers.getModKeyPath(curMod.modType, curMod.mod),
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: attr.value,
        }));
        const disabled = !modification.system.active;
        const match = effects.find((i) => i.name === modKey);
        if (match) {
          await match.update({changes, disabled});
        } else {
          await attachment.createEmbeddedDocuments("ActiveEffect", [{name: modKey, changes, disabled}]);
        }
      }
    }
    const removed = previous.flatMap((m) => Object.keys(m.system?.attributes ?? {})).filter((k) => !kept.has(k));
    const stale = effects.filter((i) => removed.includes(i.name)).map((i) => i.id);
    if (stale.length) {
      await attachment.deleteEmbeddedDocuments("ActiveEffect", stale);
    }

    await attachment.update({system: {itemmodifier: modifications}});
  }

  /** @override */
  async close(options) {
    await super.close(options);
    Hooks.off("updateItem", this._updateHook);
  }
}
