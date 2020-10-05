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
      width: 330,
      height: 650,
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
    const players = game.users.entities.filter((u) => !u.isGM && u.active);
    if (players.length > 0) {
      players.connected = true;
    }

    const pcListMode = game.settings.get("starwarsffg", "pcListMode");
    const characters = [];

    if (pcListMode === "active") {
      players.forEach((player) => {
        if (player.character) {
          characters.push(player.character);
        }
      });
    } else if (pcListMode === "owned") {
      players.forEach((player) => {
        const char = game.actors.filter((actor) => actor.hasPerm(player, "OWNER"));
        char.forEach((c) => {
          characters.push(c);
        });
      });
    }

    const dPool = { light: game.settings.get("starwarsffg", "dPoolLight"), dark: game.settings.get("starwarsffg", "dPoolDark") };
    const initiative = CONFIG.Combat.initiative.formula;
    const isGM = game.user.isGM;
    const theme = CONFIG.FFG.theme;
    if (!isGM) this.position.height = 470;
    return { dPool, players, initiative, isGM, pcListMode, characters, theme };
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Flip destiny pool DARK to LIGHT
    html.find(".destiny-flip-dtl").click((ev) => {
      let LightPool = this.form.elements["dPool.light"].value;
      let DarkPool = this.form.elements["dPool.dark"].value;
      if (DarkPool > 0) {
        LightPool++;
        DarkPool--;
        this.form.elements["dPool.light"].value = LightPool;
        this.form.elements["dPool.dark"].value = DarkPool;
      }
    });

    // Flip destiny pool LIGHT to DARK
    html.find(".destiny-flip-ltd").click((ev) => {
      let LightPool = this.form.elements["dPool.light"].value;
      let DarkPool = this.form.elements["dPool.dark"].value;
      if (LightPool > 0) {
        LightPool--;
        DarkPool++;
        this.form.elements["dPool.light"].value = LightPool;
        this.form.elements["dPool.dark"].value = DarkPool;
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
      const token = c.getActiveTokens();
      this._addCharacterToCombat(c, token, game.combat);
    });
    // Add all characters to combat tracker.
    html.find(".group-to-combat").click((ev) => {
      const characters = [];
      const groupmanager = document.getElementById("group-manager");
      const charlist = groupmanager.querySelectorAll('tr[class="player-character"]');
      charlist.forEach((element) => {
        characters.push(element.dataset["character"]);
      });
      characters.forEach((c) => {
        const character = game.actors.get(c);
        const token = character.getActiveTokens();
        this._addCharacterToCombat(character, token, game.combat);
      });
    });

    // Add XP to individual character.
    html.find(".add-XP").click((ev) => {
      const character = ev.currentTarget.dataset.character;
      const c = game.actors.get(character);
      this._grantXP(c);
    });
    // Add XP to all characters.
    html.find(".bulk-XP").click((ev) => {
      const characters = [];
      const groupmanager = document.getElementById("group-manager");
      const charlist = groupmanager.querySelectorAll('tr[class="player-character"]');
      charlist.forEach((element) => {
        characters.push(element.dataset["character"]);
      });
      this._bulkXP(characters);
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
    const formDPool = expandObject(formData).dPool || {};
    game.settings.set("starwarsffg", "dPoolLight", formDPool.light);
    game.settings.set("starwarsffg", "dPoolDark", formDPool.dark);
    return formData;
  }

  async _addCharacterToCombat(character, token, cbt) {
    if (token.length > 0) {
      // If no combat encounter is active, create one.
      if (!cbt) {
        let scene = game.scenes.viewed;
        if (!scene) return;
        let cbt = await game.combats.object.create({ scene: scene._id, active: true });
        await cbt.activate();
      }
      await token[0].toggleCombat(game.combat);
    } else {
      ui.notifications.warn(`${character.name} has no active Token in the current scene.`);
    }
  }

  async _grantXP(character) {
    const id = randomID();
    const description = game.i18n.localize("SWFFG.GrantXPTo") + ` ${character.name}...`;
    const content = await renderTemplate("systems/starwarsffg/templates/grant-xp.html", {
      id,
    });

    new Dialog({
      title: description,
      content,
      buttons: {
        one: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("SWFFG.GrantXP"),
          callback: () => {
            const container = document.getElementById(id);
            const amount = container.querySelector('input[name="amount"]');
            character.update({ ["data.experience.total"]: character.data.data.experience.total + +amount.value });
            character.update({ ["data.experience.available"]: character.data.data.experience.available + +amount.value });
            ui.notifications.info(`Granted ${amount.value} XP to ${character.name}.`);
          },
        },
        two: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("SWFFG.Cancel"),
        },
      },
    }).render(true);
  }

  async _bulkXP(characters) {
    const id = randomID();
    const description = game.i18n.localize("SWFFG.GrantXPToAllCharacters");
    const content = await renderTemplate("systems/starwarsffg/templates/grant-xp.html", {
      id,
    });

    new Dialog({
      title: description,
      content,
      buttons: {
        one: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("SWFFG.GrantXP"),
          callback: () => {
            const container = document.getElementById(id);
            const amount = container.querySelector('input[name="amount"]');
            characters.forEach((c) => {
              const character = game.actors.get(c);
              character.update({ ["data.experience.total"]: character.data.data.experience.total + +amount.value });
              character.update({ ["data.experience.available"]: character.data.data.experience.available + +amount.value });
              ui.notifications.info(`Granted ${amount.value} XP to ${character.name}.`);
            });
          },
        },
        two: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("SWFFG.Cancel"),
        },
      },
    }).render(true);
  }
}

// Catch updates to connected players and update the group manager window if necessary.
Hooks.on("renderPlayerList", (playerList) => {
  const groupmanager = canvas?.groupmanager?.window;
  if (groupmanager) {
    groupmanager.render();
  }
});
// Catch updates to actors and update the group manager window if necessary.
Hooks.on("updateActor", (actor, data, options, id) => {
  const groupmanager = canvas?.groupmanager?.window;
  if (groupmanager) {
    groupmanager.render();
  }
});
Hooks.on("renderActorSheet", (actor, data, options, id) => {
  const groupmanager = canvas?.groupmanager?.window;
  if (groupmanager) {
    groupmanager.render();
  }
});
