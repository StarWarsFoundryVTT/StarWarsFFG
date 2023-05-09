export class GroupManagerLayer extends CanvasLayer {
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
  constructor(options) {
    super();
    this.obligations = [];
    this.duties = [];
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "form", "group-manager"],
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: true,
      popOut: true,
      editable: game.user.isGM,
      resizable: true,
      width: 330,
      height: 900,
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
    const players = game.users.contents.filter((u) => !u.isGM && u.active);
    if (players.length > 0) {
      players.connected = true;
    }

    const pcListMode = game.settings.get("starwarsffg", "pcListMode");
    const characters = [];
    let obligationRangeStart = 0;
    let dutyRangeStart = 0;

    if (pcListMode === "active") {
      players.forEach((player) => {
        if (player.character) {
          try {
            obligationRangeStart = this._addCharacterObligationDuty(player.character, obligationRangeStart, player.character.system.obligationlist, "obligations");
            dutyRangeStart = this._addCharacterObligationDuty(player.character, dutyRangeStart, player.character.system.dutylist, "duties");
            //obligationRangeStart = this._addCharacterObligations(player.character, obligationRangeStart);
            //dutyRangeStart = this._addCharacterDuties(player.character, dutyRangeStart);
            characters.push(player.character);
          } catch (err) {
            CONFIG.logger.warn(`Unable to add player (${player.character.name}) to obligation/duty table`, err);
          }
        }
      });
    } else if (pcListMode === "owned") {
      game.actors.filter((actor) => {
        for (let player of players) {
          if (actor.testUserPermission(player, "OWNER")) {
            // use actor if any active player has ownership
            return true;
          }
        }
        return false;
      })
      .forEach((c) => {
        try {
          obligationRangeStart = this._addCharacterObligationDuty(c, obligationRangeStart, c.system.obligationlist, "obligations");
          dutyRangeStart = this._addCharacterObligationDuty(c, dutyRangeStart, c.system.dutylist, "duties");
          characters.push(c);
          // obligationRangeStart = this._addCharacterObligations(c, obligationRangeStart);
          // dutyRangeStart = this._addCharacterDuties(c, dutyRangeStart);
        } catch (err) {
          CONFIG.logger.warn(`Unable to add player (${c.name}) to obligation/duty table`, err);
        }
      });
    }

    const dPool = { light: game.settings.get("starwarsffg", "dPoolLight"), dark: game.settings.get("starwarsffg", "dPoolDark") };
    const initiative = CONFIG.Combat.initiative.formula;
    const isGM = game.user.isGM;
    const theme = CONFIG.FFG.theme;
    players.hasObligation = this.obligations?.length;
    let obligations = this.obligations;
    players.hasDuty = this.duties?.length;
    let duties = this.duties;
    if (!isGM) this.position.height = 470;

    const labels = {
      light: game.settings.get("starwarsffg", "destiny-pool-light"),
      dark: game.settings.get("starwarsffg", "destiny-pool-dark"),
    };

    return { dPool, players, initiative, isGM, pcListMode, characters, obligations, duties, theme, labels };
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
      this._addCharacterToCombat(character, game.combat);
    });
    // Add all characters to combat tracker.
    html.find(".group-to-combat").click((ev) => {
      const characters = [];
      const groupmanager = document.getElementById("group-manager");
      const charlist = groupmanager.querySelectorAll('tr[class="player-character"]');
      const tokens = canvas.tokens.controlled;
      charlist.forEach((element) => {
        characters.push(element.dataset["character"]);
      });
      this._addGroupToCombat(characters, tokens, game.combat);
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

    html.find(".obligation-button").click((ev) => {
      this._rollObligation();
    });

    html.find(".duty-button").click((ev) => {
      this._rollDuty();
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

  _addCharacterObligationDuty(character, rangeStart, list, type) {
    try {
      Object.values(list).forEach((item) => {
        let rangeEnd = rangeStart + parseInt(item.magnitude);
        this[type].push({
          playerId: character.id,
          name: character.name,
          type: item.type,
          magnitude: item.magnitude,
          rangeStart: rangeStart + 1,
          rangeEnd: rangeEnd,
        });
        rangeStart = rangeEnd;
      });
    } catch (err) {
      CONFIG.logger.warn(`Unable to add player ${character.name} `);
    }
    return rangeStart;
  }

  async _rollObligation() {
    this._rollTable(this.obligations, game.i18n.localize("SWFFG.DescriptionObligation"));
  }

  async _rollDuty() {
    this._rollTable(this.duties, game.i18n.localize("SWFFG.DescriptionDuty"));
  }

  async _rollTable(table, type) {
    let r = new Roll("1d100");
    await r.evaluate();
    let rollOptions = game.settings.get("starwarsffg", "privateTriggers") ? { rollMode: "gmroll" } : {};
    r.toMessage(
      {
        flavor: `${game.i18n.localize("SWFFG.Rolling")} ${type}...`,
      },
      rollOptions
    );
    let filteredTable = table.filter((entry) => entry.rangeStart <= r.total && r.total <= entry.rangeEnd);
    let tableResult = filteredTable?.length ? `${filteredTable[0].type} ${type} ${game.i18n.localize("SWFFG.Triggered")} ${game.i18n.localize("SWFFG.For")} @Actor[${filteredTable[0].playerId}]{${filteredTable[0].name}}` : `${game.i18n.localize("SWFFG.OptionValueNo")} ${type} ${game.i18n.localize("SWFFG.Triggered")}`;
    let messageOptions = {
      user: game.user.id,
      content: tableResult,
    };
    if (game.settings.get("starwarsffg", "privateTriggers")) {
      messageOptions.whisper = ChatMessage.getWhisperRecipients("GM");
    }
    ChatMessage.create(messageOptions);
  }

  async _addGroupToCombat(characters, targets, cbt) {
    await this._setupCombat(cbt);
    let tokens = targets.filter((t) => !t.inCombat);
    await Promise.all(
      characters.map(async (c) => {
        let token = await this._getCharacterToken(game.actors.get(c));
        if (token) {
          if (!token._controlled && !token.inCombat) {
            tokens.push(token);
          }
        } else {
          ui.notifications.warn(`${c.name} has no active Token in the current scene.`);
        }
      })
    );
    const createData = tokens.map((t) => {
      return { tokenId: t.id };
    });
    await game.combat.createEmbeddedDocuments('Combatant', createData);
  }

  async _addCharacterToCombat(character, cbt) {
    await this._setupCombat(cbt);
    let token = await this._getCharacterToken(game.actors.get(character));
    if (token && !token.inCombat) {
        await game.combat.createEmbeddedDocuments('Combatant', [{ tokenId: token.id }]);
      //await game.combat.createCombatant({ tokenId: token.id });
    } else {
      ui.notifications.warn(`User has no active Token in the current scene.`);
    }
  }

  async _getCharacterToken(character) {
    let activeTokens = character.getActiveTokens();
    return activeTokens.length ? activeTokens[0] : null;
  }

  async _setupCombat(cbt) {
    // If no combat encounter is active, create one.
    if (!cbt) {
      let scene = game.scenes.viewed;
      if (!scene) return;
      let cbt = await game.combats.object.create({ scene: scene.id, active: true });
      await cbt.activate();
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
            character.update({ ["data.experience.total"]: +character.system.experience.total + +amount.value });
            character.update({ ["data.experience.available"]: +character.system.experience.available + +amount.value });
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
              character.update({ ["data.experience.total"]: +character.system.experience.total + +amount.value });
              character.update({ ["data.experience.available"]: +character.system.experience.available + +amount.value });
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
