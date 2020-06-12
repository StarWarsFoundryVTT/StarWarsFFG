export class GroupManagerLayer extends TokenLayer {
  constructor() {
    super();
  }

  static get layerOptions() {
    return mergeObject(super.layerOptions, {
      canDragCreate: false,
    });
  }
  /* -------------------------------------------- */
  /*  Methods
  /* -------------------------------------------- */

  activate() {
    super.activate();
  }

  deactivate() {
    super.deactivate();
  }

  async draw() {
    super.draw();
  }

  /* -------------------------------------------- */
}

export class GroupManager extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "form", "group-manager"],
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: true,
      popOut: true,
      editable: game.user.isGM,
      width: 600,
      height: 550,
      template: "systems/starwarsffg/templates/group-manager.html",
      id: "group-manager",
      title: "Group Manager",
    });
  }

  /* -------------------------------------------- */

  /**
   * Obtain module metadata and merge it with game settings which track current module visibility
   * @return {Object}   The data provided to the template when rendering the form
   */
  getData() {
    const players = game.users.entities.filter((u) => !u.isGM && u.character && u.active);
    if (players.length > 0) {
      players.connected = true;
    }
    const initiative = { "value": CONFIG.Combat.initiative.formula };
    return { g: game, players, initiative };
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Flip destiny pool DARK to LIGHT
    html.find(".destiny-flip-dtl").click((ev) => {
      let LightPool = this.form.elements["g.ffg.DestinyPool.Light"].value;
      let DarkPool = this.form.elements["g.ffg.DestinyPool.Dark"].value;
      if (DarkPool > 0) {
        LightPool++;
        DarkPool--;
        this.form.elements["g.ffg.DestinyPool.Light"].value = LightPool;
        this.form.elements["g.ffg.DestinyPool.Dark"].value = DarkPool;
      }
    });

    // Flip destiny pool LIGHT to DARK
    html.find(".destiny-flip-ltd").click((ev) => {
      let LightPool = this.form.elements["g.ffg.DestinyPool.Light"].value;
      let DarkPool = this.form.elements["g.ffg.DestinyPool.Dark"].value;
      if (LightPool > 0) {
        LightPool--;
        DarkPool++;
        this.form.elements["g.ffg.DestinyPool.Light"].value = LightPool;
        this.form.elements["g.ffg.DestinyPool.Dark"].value = DarkPool;
      }
    });

    // Listen for initiative dropdown change and update initiative formula accordingly.
    html.find(".initiative-mode").change((ev) => {
      const init_value = ev.target.value.charAt(0).toLowerCase();
      game.settings.set("starwarsffg", "initiativeRule", init_value);
      ui.notifications.info(`Initiative mode changed to: ${ev.target.value}`);
    });

    // Add individual character to combat tracker.
    html.find(".add-to-combat").click((ev) => {
      const character = ev.currentTarget.dataset.character;
      const c = game.actors.get(character);
      ui.notifications.warn("This function is not yet implemented.");
    });

    // Temporary warning for non-functional buttons.
    html.find(".temp-button").click((ev) => {
      ui.notifications.warn("This function is not yet implemented.");
    });

    // Open character sheet on row click.
    html.find(".player-character").click((ev) => {
      if (!$(ev.target).hasClass("fas") && ev.target.localName !== "button") {
        const li = $(ev.currentTarget);
        const actorId = li.data("character");
        const actor = game.actors.get(actorId);
        if (actor?.sheet) {
          actor.sheet.render(true);
        }
      }
    });
  }

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  _updateObject(event, formData) {
    const formDPool = expandObject(formData).g.ffg.DestinyPool || {};
    game.ffg.DestinyPool.Light = formDPool.Light;
    game.ffg.DestinyPool.Dark = formDPool.Dark;
    return formData;
  }
}

// Catch updates to connected players and update the group manager window if necessary.
Hooks.on("renderPlayerList", (playerList) => {
  const groupmanager = canvas.groupmanager.window;
  if (groupmanager) {
    groupmanager.render();
  }
});
// Catch updates to actors and update the group manager window if necessary.
Hooks.on("updateActor", (actor, data, options, id) => {
  const groupmanager = canvas.groupmanager.window;
  if (groupmanager) {
    groupmanager.render();
  }
});
