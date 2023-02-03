export default class RollBuilderFFG extends FormApplication {
  constructor(rollData, rollDicePool, rollDescription, rollSkillName, rollItem, rollAdditionalFlavor, rollSound) {
    super();
    this.roll = {
      data: rollData,
      skillName: rollSkillName,
      item: rollItem,
      sound: rollSound,
      flavor: rollAdditionalFlavor,
    };
    this.dicePool = rollDicePool;
    this.description = rollDescription;
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "roll-builder",
      classes: ["starwarsffg", "roll-builder-dialog"],
      template: "systems/starwarsffg/templates/dice/roll-options-ffg.html",
    });
  }

  /** @override */
  get title() {
    return this.description || game.i18n.localize("SWFFG.RollingDefaultTitle");
  }

  /** @override */
  async getData() {
    //get all possible sounds
    let sounds = [];

    let canUserAddAudio = await game.settings.get("starwarsffg", "allowUsersAddRollAudio");
    let canUserAddFlavor = game.user.isGM || !this?.roll?.flavor;

    if (game.user.isGM) {
      game.playlists.contents.forEach((playlist) => {
        playlist.sounds.forEach((sound) => {
          let selected = false;
          const s = this.roll?.sound ?? this.roll?.item?.flags?.starwarsffg?.ffgsound;
          if (s === sound.path) {
            selected = true;
          }
          sounds.push({ name: sound.name, path: sound.path, selected });
        });
      });
    } else if (canUserAddAudio) {
      const playlistId = await game.settings.get("starwarsffg", "allowUsersAddRollAudioPlaylist");
      const playlist = await game.playlists.get(playlistId);

      if (playlist) {
        playlist.sounds.forEach((sound) => {
          let selected = false;
          const s = this.roll?.sound ?? this.roll?.item?.flags?.starwarsffg?.ffgsound;
          if (s === sound.path) {
            selected = true;
          }
          sounds.push({ name: sound.name, path: sound.path, selected });
        });
      } else {
        CONFIG.logger.warn(`Playlist for players does not exist, disabling audio`);
        canUserAddAudio = false;
      }
    }

    let users = [{ name: "Send To All", id: "all" }];
    if (game.user.isGM) {
      game.users.contents.forEach((user) => {
        if (user.visible && user.id !== game.user.id) {
          users.push({ name: user.name, id: user.id });
        }
      });
    }

    const enableForceDie = game.settings.get("starwarsffg", "enableForceDie");
    const labels = {
      light: game.settings.get("starwarsffg", "destiny-pool-light"),
      dark: game.settings.get("starwarsffg", "destiny-pool-dark"),
    };

    return {
      sounds,
      isGM: game.user.isGM,
      canUserAddAudio,
      flavor: this.roll.flavor,
      users,
      enableForceDie,
      labels,
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    this._initializeInputs(html);
    this._activateInputs(html);

    html.find(".btn").click(async (event) => {
      // if sound was not passed search for sound dropdown value
      if (!this.roll.sound) {
        const sound = html.find(".sound-selection")?.[0]?.value;
        if (sound) {
          this.roll.sound = sound;
          if (this?.roll?.item) {
            let entity;
            let entityData;
            if (!this?.roll?.item?.flags?.starwarsffg?.uuid) {
              entity = game.actors.get(this.roll.data.actor._id);
              entityData = {
                _id: this.roll.item.id,
              };
            } else {
              const parts = this.roll.item.flags.starwarsffg?.uuid.split(".");
              const [sceneName, sceneId, entityName, entityId, embeddedName, embeddedId] = parts;
              entity = game.actors.tokens[entityId].items.get(embeddedId);
              if (parts.length === 6) {
                entityData = {
                  _id: entity.id,
                };
              }
            }
            setProperty(entityData, "flags.starwarsffg.ffgsound", sound);
            entity.update(entityData);
          }
        }
      }

      if (!this.roll.flavor) {
        const flavor = html.find(".flavor-text")?.[0]?.value;
        if (flavor) {
          this.roll.flavor = flavor;
        }
      }

      // validate that required data is present
      if (this.roll.hasOwnProperty('item') && this.roll.item !== undefined && this.roll.item.hasOwnProperty('flags') && !this.roll.item.flags.starwarsffg.uuid) {
        // uuid is missing, look up the item and set it, so it's fixed going forward
        let tmp_item = await fromUuid(this.roll.item.uuid);
        await tmp_item.setFlag("starwarsffg", "uuid", this.roll.item.uuid);
      }

      const sentToPlayer = html.find(".user-selection")?.[0]?.value;
      if (sentToPlayer) {
        let container = $(`<div class='dice-pool'></div>`)[0];
        this.dicePool.renderAdvancedPreview(container);

        const messageText = `<div>
          <div>${game.i18n.localize("SWFFG.SentDicePoolRollHint")}</div>
          ${$(container).html()}
          <button class="ffg-pool-to-player">${game.i18n.localize("SWFFG.SentDicePoolRoll")}</button>
        </div>`;

        let chatOptions = {
          user: game.user.id,
          content: messageText,
          flags: {
            starwarsffg: {
              roll: this.roll,
              dicePool: this.dicePool,
              description: this.description,
            },
          },
        };

        if (sentToPlayer !== "all") {
          chatOptions.whisper = [sentToPlayer];
        }

        ChatMessage.create(chatOptions);
      } else {
        if (this.roll.crew) {
          this.roll.item['crew'] = this.roll.crew
        }
        const roll = new game.ffg.RollFFG(this.dicePool.renderDiceExpression(), this.roll.item, this.dicePool, this.roll.flavor);
        // check if this is a crew roll - and it's a roll for a weapon
        if (this.roll.item !== undefined && this.roll.item.hasOwnProperty('crew') && Object.keys(this.roll.item).length > 1) {
          await this.roll.item.update({"flags": {"starwarsffg": {"crew": this.roll.item.crew}}})
        }
        await roll.toMessage({
          user: game.user.id,
          speaker: {
            actor: game.actors.get(this.roll.data?.actor?._id),
            alias: this.roll.data?.token?.name,
            token: this.roll.data?.token?._id,
          },
          flavor: `${game.i18n.localize("SWFFG.Rolling")} ${game.i18n.localize(this.roll.skillName)}...`,
        });
        if (this.roll?.sound) {
          AudioHelper.play({ src: this.roll.sound }, true);
        }

        return roll;
      }
    });

    html.find(".extend-button").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      $(event.currentTarget).toggleClass("minimize");

      const selector = $(event.currentTarget).next();
      $(selector).toggleClass("hide");
      $(selector).toggleClass("maximize");

      if (!$(event.currentTarget).hasClass("minimize")) {
        $(selector).val("");
      }
    });
  }

  _updatePreview(html) {
    const poolDiv = html.find(".dice-pool-dialog .dice-pool")[0];
    poolDiv.innerHTML = "";
    this.dicePool.renderPreview(poolDiv);
  }

  _initializeInputs(html) {
    html.find(".pool-value input").each((key, value) => {
      const name = $(value).attr("name");
      value.value = this.dicePool[name];
    });

    html.find(".pool-additional input").each((key, value) => {
      const name = $(value).attr("name");
      value.value = this.dicePool[name];
      $(value).attr("allowNegative", true);
    });

    this._updatePreview(html);
  }

  _activateInputs(html) {
    html.find(".upgrade-buttons button").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const id = $(event.currentTarget).attr("id");

      switch (id.toLowerCase()) {
        case "upgrade-ability": {
          this.dicePool.upgrade(1);
          break;
        }
        case "downgrade-ability": {
          this.dicePool.upgrade(-1);
          break;
        }
        case "upgrade-difficulty": {
          this.dicePool.upgradeDifficulty(1);
          break;
        }
        case "downgrade-difficulty": {
          this.dicePool.upgradeDifficulty(-1);
          break;
        }
      }
      this._initializeInputs(html);
    });

    html.find(".pool-container, .pool-additional").on("click", (event) => {
      let input;

      if ($(event.currentTarget).hasClass(".pool-container")) {
        input = $(event.currentTarget).find(".pool-value input")[0];
      } else {
        input = $(event.currentTarget).find("input")[0];
        if(!input) {
          input = $(event.currentTarget.nextElementSibling).find("input")[0];
        }
      }

      input.value++;
      this.dicePool[input.name] = parseInt(input.value);
      this._updatePreview(html);
    });

    html.find(".pool-container, .pool-additional").on("contextmenu", (event) => {
      let input;

      if ($(event.currentTarget).hasClass(".pool-container")) {
        input = $(event.currentTarget).find(".pool-value input")[0];
      } else {
        input = $(event.currentTarget).find("input")[0];
        if(!input) {
          input = $(event.currentTarget.nextElementSibling).find("input")[0];
        }
      }

      const allowNegative = $(input).attr("allowNegative");

      if (input.value > 0 || allowNegative) {
        input.value--;
        this.dicePool[input.name] = parseInt(input.value);
        this._updatePreview(html);
      }
    });
  }

  _updateObject() {}
}
