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
        classes: ["starwarsffg", "flat_editor"],
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

    // build out the mod type and mod choices
    let modTypeChoices = this._getModTypeChoices();
    let modChoices = CONFIG.FFG.modTypeToModMap;
    let data = await this._enrichData();

    return {
      modTypeChoices: modTypeChoices,
      modChoices: modChoices,
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
    enriched.clickedObject.system.enrichedDescription = await TextEditor.enrichHTML(this.data.clickedObject.system.description);
    for (let modification of enriched.clickedObject.system.itemmodifier) {
      modification.system.enrichedDescription = await TextEditor.enrichHTML(modification.system.description);
    }
    return enriched;
  }

  /**
   * Get the available "mod types" for a given mod or modification (based on the "type" of the mod/modification)
   * @param parentType
   * @private
   */
  _getModTypeChoices() {
    return CONFIG.FFG.itemTypeToModTypeMap;
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
      // TODO: this appears to trigger twice the first time it's used on load
      const dragDrop = new DragDrop({
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
      // TODO: this might break with multiple attachments
      updateData = this.data.sourceObject.system.itemattachment;
      for (let attachment of updateData) {
        if (attachment._id === this.data.clickedObject._id) {
          // merge our drag-and-dropped item into the existing data
          attachment.system.itemmodifier.push(droppedObject.toObject());
          // update the local object so we can see the update in the editor
          this.data.clickedObject.system.itemmodifier.push(droppedObject.toObject());
        }
      }
      // TODO: handle drag-and-drop of attachment onto item
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
      const modTypeChoices = this._getModTypeChoices();
      const modChoices = CONFIG.FFG.modTypeToModMap;
      const modificationId = $(event.currentTarget).data("modification-id");
      let direct = this.data.clickedObject.type !== "itemattachment";
      if (modificationId === undefined) {
        // we aren't adding it to a modification, so this is true
        direct = true;
      }

      CONFIG.logger.debug(`caught creating a new mod on an attachment. data: ${modificationId}, ${direct}`);
      CONFIG.logger.debug(modTypeChoices);
      CONFIG.logger.debug(modChoices);
      CONFIG.logger.debug(`expected new modtype is ${Object.keys(modTypeChoices)[0]}`);
      CONFIG.logger.debug(`expected new mod mod is ${modChoices[Object.keys(modTypeChoices)[0]]}`);

      let rendered = await renderTemplate(
        'systems/starwarsffg/templates/items/dialogs/ffg-mod.html',
        { // TODO: this should probably be a new item of the correct type so it assumes any changes to the data model automatically
          modTypeChoices: modTypeChoices,
          modChoices: modChoices,
          direct: direct,
          number: modificationId,
          attachmentType: this.data.clickedObject.system.type,
          id: `attr${nk}`,
          attr: {
            modtype: Object.keys(modTypeChoices[this.data.clickedObject.system.type])[0],
            mod: Object.keys(modChoices[Object.keys(modTypeChoices[this.data.clickedObject.system.type])[0]])[0],
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
    let action = event.currentTarget.getAttribute('data-action');
    if (action === 'create') {
      const modTypeChoices = this._getModTypeChoices();
      const modChoices = CONFIG.FFG.modTypeToModMap;
      let rendered = await renderTemplate(
        'systems/starwarsffg/templates/items/dialogs/ffg-modification.html',
        { // TODO: this should probably be a new item of the correct type so it assumes any changes to the data model automatically
          modTypeChoices: modTypeChoices,
          modChoices: modChoices,
          direct: true,
          mod: {
            name: "New Modification",
            system: {
              description: "Placeholder description",
              active: false,
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
      // TODO: iterate over attrs in the children, look for matching AEs, and delete them
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
      this.data.clickedObject.system.attributes[mod].modtype = Object.values(this._getModTypeChoices()[event.currentTarget.value])[0].value;
      this.data.clickedObject.system.attributes[mod].mod = Object.values(CONFIG.FFG.modTypeToModMap[Object.values(this._getModTypeChoices()[event.currentTarget.value])[0].value])[0].value;
    }

    // if the item is an attachment, we also need to update mods on modifications
    if (this.data.clickedObject.type === "itemattachment") {
      for (let modifier of Object.keys(this.data.clickedObject.system.itemmodifier)) {
        // modifiers sometimes don't have the attributes in them...
        if (Object.keys(this.data.clickedObject.system.itemmodifier[modifier].system).includes("attributes")) {
          for (let mod of Object.keys(this.data.clickedObject.system.itemmodifier[modifier].system.attributes)) {
            this.data.clickedObject.system.itemmodifier[modifier].system.attributes[mod].modtype = Object.values(this._getModTypeChoices()[event.currentTarget.value])[0].value;
            this.data.clickedObject.system.itemmodifier[modifier].system.attributes[mod].mod = Object.values(CONFIG.FFG.modTypeToModMap[Object.values(this._getModTypeChoices()[event.currentTarget.value])[0].value])[0].value;
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
      let chosen_config = CONFIG.FFG.modTypeToModMap[new_value];
      Object.keys(chosen_config).forEach(function (choice) {
        new_html += `<option value="${chosen_config[choice]['value']}">${game.i18n.localize(chosen_config[choice]['label'])}</option>`
      });
      $(event.currentTarget).parent().find(".flat_editor.dropdown.mod").html(new_html);
    }
  }

  /** @override */
  async _updateObject(event, formData) {
    formData = ItemHelpers.explodeFormData(formData)

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
          console.log(attachment.system.attributes)
          // iterate over the mods on the existing attachment and remove them if they are not present in the new data
          for (let modKey of Object.keys(attachment.system.attributes)) {
            if (!Object.keys(formData.system.attributes).includes(modKey)) {
              CONFIG.logger.debug(`>> Detected key ${modKey} was removed, attempting to locate matching active effect`);
              formData.system.attributes[`-=${modKey}`] = null;
              delete attachment.system.attributes[modKey];
              // TODO: handle drag-and-drop of attachment onto item (and deleting from item)
              // TODO: take a note - this breaks if the same key is in use across multiple mods, e.g. dragging "Additional Damage Mod" onto an attachment twice
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
              const path = ModifierHelpers.getModKeyPath(formData.system.attributes[modKey].modtype, formData.system.attributes[modKey].mod);
              const match = existingActiveEffects.find(i => i.name === modKey);
              if (match) {
                // existing entry
                await match.update({
                  changes: [{
                    key: path,
                    mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                    value: parseInt(formData.system.attributes[modKey].value),
                  }]
                });
              } else {
                // new entry
                const effect = {
                  name: modKey,
                  changes: [{
                    key: path,
                    mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                    value: parseInt(formData.system.attributes[modKey].value),
                  }],
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
                const path = ModifierHelpers.getModKeyPath(modifier.system.attributes[modKey].modtype, modifier.system.attributes[modKey].mod);
                const match = existingActiveEffects.find(i => i.name === modKey);
                if (match) {
                  // existing entry
                  await match.update({
                    changes: [{
                      key: path,
                      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                      value: parseInt(modifier.system.attributes[modKey].value),
                    }]
                  });
                } else {
                  // new entry
                  const effect = {
                    name: modKey,
                    changes: [{
                      key: path,
                      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                      value: parseInt(modifier.system.attributes[modKey].value),
                    }],
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
        const path = ModifierHelpers.getModKeyPath(formData.system.attributes[modKey].modtype, formData.system.attributes[modKey].mod);
        const match = existingActiveEffects.find(i => i.name === modKey);
        if (match) {
          // existing entry
          await match.update({
            changes: [{
              key: path,
              mode: CONST.ACTIVE_EFFECT_MODES.ADD,
              value: parseInt(formData.system.attributes[modKey].value),
            }]
          });
        } else {
          // new entry
          const effect = {
            name: modKey,
            changes: [{
              key: path,
              mode: CONST.ACTIVE_EFFECT_MODES.ADD,
              value: parseInt(formData.system.attributes[modKey].value),
            }],
          };
          CONFIG.logger.debug(`>>>> Staged AE for creation: ${JSON.stringify(effect)}`);
          await this.data.sourceObject.createEmbeddedDocuments("ActiveEffect", [effect]);
        }
      }
      await this.data.sourceObject.update({system: {itemmodifier: updateData}});
    }
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

    // build out the mod type and mod choices
    let modTypeChoices = this._getModTypeChoices();
    let modChoices = CONFIG.FFG.modTypeToModMap;
    let activations = CONFIG.FFG.activations;
    let data = await this._enrichData();

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
      const modTypeChoices = this._getModTypeChoices();
      const modChoices = CONFIG.FFG.modTypeToModMap;
      const modificationId = $(event.currentTarget).data("modification-id");
      const direct = this.data.clickedObject.type !== "itemattachment";

      CONFIG.logger.debug(`caught creating a new mod on a talent. data: ${modificationId}, ${direct}`);
      CONFIG.logger.debug(modTypeChoices);
      CONFIG.logger.debug(modChoices);
      CONFIG.logger.debug(`expected new modtype is ${Object.keys(modTypeChoices)[0]}`);
      CONFIG.logger.debug(`expected new mod mod is ${modChoices[Object.keys(modTypeChoices)[0]]}`);

      let rendered = await renderTemplate(
        'systems/starwarsffg/templates/items/dialogs/ffg-mod.html',
        { // TODO: this should probably be a new item of the correct type so it assumes any changes to the data model automatically
          modTypeChoices: modTypeChoices,
          modChoices: modChoices,
          direct: direct,
          number: modificationId,
          attachmentType: 'all',
          id: `attr${nk}`,
          attr: {
            modtype: Object.keys(modTypeChoices['all'])[0],
            mod: Object.keys(modChoices[Object.keys(modTypeChoices['all'])[0]])[0],
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
    enriched.clickedObject.enrichedDescription = await TextEditor.enrichHTML(this.data.clickedObject.description);
    return enriched;
  }

  /** @override */
  async _updateObject(event, formData) {
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
        const path = ModifierHelpers.getModKeyPath(formData.attributes[modKey].modtype, formData.attributes[modKey].mod);
        const match = existingActiveEffects.find(i => i.name === modKey);
        if (match) {
          // existing entry
          await match.update({
            changes: [{
              key: path,
              mode: CONST.ACTIVE_EFFECT_MODES.ADD,
              value: parseInt(formData.attributes[modKey].value),
            }]
          });
        } else {
          // new entry
          const effect = {
            name: modKey,
            changes: [{
              key: path,
              mode: CONST.ACTIVE_EFFECT_MODES.ADD,
              value: parseInt(formData.attributes[modKey].value),
            }],
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
