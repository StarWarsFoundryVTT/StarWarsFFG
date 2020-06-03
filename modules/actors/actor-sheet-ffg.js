/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class ActorSheetFFG extends ActorSheet {
  constructor(...args) {
    super(...args);
    /**
     * Track the set of filters which are applied
     * @type {Set}
     */
    this._filters = {
      skills: new Set(),
    };
  }

  pools = new Map();

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "actor"],
      template: "systems/starwarsffg/templates/actors/ffg-character-sheet.html",
      width: 710,
      height: 650,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "characteristics" }],
      scrollY: [".tableWithHeader", ".tab"],
    });
  }

  /** @override */
  get template() {
    const path = "systems/starwarsffg/templates/actors";
    return `${path}/ffg-${this.actor.data.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];
    for (let attr of Object.values(data.data.attributes)) {
      attr.isCheckbox = attr.dtype === "Boolean";
    }
    data.FFG = CONFIG.FFG;

    switch (this.actor.data.type) {
      case "character":
        this.position.width = 588;
        this.position.height = 766;
        break;
      case "minion":
        this.position.width = 588;
        this.position.height = 620;
        break;
      case "vehicle":
        this.position.width = 588;
        this.position.height = 824;
      default:
    }
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // TODO: This is not needed in Foundry 0.6.0
    // Activate tabs
    let tabs = html.find(".tabs");
    let initial = this._sheetTab;
    new TabsV2(tabs, {
      initial: initial,
      callback: (clicked) => (this._sheetTab = clicked.data("tab")),
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Update Inventory Item - By clicking entire line
    html.find(".item").click((ev) => {
      if (!$(ev.target).hasClass("fa-trash")) {
        const li = $(ev.currentTarget);
        const item = this.actor.getOwnedItem(li.data("itemId"));
        if (item?.sheet) {
          item.sheet.render(true);
        }
      }
    });
    // Update Talent - By clicking entire line
    html.find(".talents.item").click((ev) => {
      if (!$(ev.target).hasClass("fa-trash")) {
        const li = $(ev.currentTarget);
        const item = this.actor.getOwnedItem(li.data("itemId"));
        item.sheet.render(true);
      }
    });

    // Delete Inventory Item
    html.find(".item-delete").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // Set skill filter element.
    html.find(".skillfilter").each((_, elem) => {
      const filters = this._filters.skills;
      if (!filters.filter) {
        filters.filter = "all";
      }
    });

    // Update radio button checked status for skill filter controls.
    html.find(".filter-control").each((_, elem) => {
      if (elem.id == this._filters.skills.filter) {
        elem.checked = true;
      } else {
        elem.checked = false;
      }
    });

    // Setup dice pool image and hide filtered skills
    html.find(".skill").each((_, elem) => {
      this._addSkillDicePool(elem);
      const filters = this._filters.skills;
      if (filters.filter != "all") {
        if (elem.dataset["skilltype"] != filters.filter) {
          elem.style.display = "none";
        } else {
          elem.style.display = "";
        }
      }
    });

    // Roll Skill
    html
      .find(".roll-button")
      .children()
      .on("click", async (event) => {
        let upgradeType = null;
        if (event.ctrlKey && !event.shiftKey) {
          upgradeType = "ability";
        } else if (!event.ctrlKey && event.shiftKey) {
          upgradeType = "difficulty";
        }
        await this._rollSkill(event, upgradeType);
      });

    // Add or Remove Attribute
    html.find(".attributes").on("click", ".attribute-control", this._onClickAttributeControl.bind(this));

    // Update Filter value.
    html.find(".skillfilter").on("click", ".filter-control", this._onClickFilterControl.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Listen for click events on an attribute control to modify the composition of attributes in the sheet
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onClickAttributeControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const attrs = this.object.data.data.attributes;
    const form = this.form;

    // Add new attribute
    if (action === "create") {
      const nk = Object.keys(attrs).length + 1;
      let newKey = document.createElement("div");
      newKey.innerHTML = `<input type="text" name="data.attributes.attr${nk}.key" value="attr${nk}" style="display:none;"/><select class="attribute-modtype" name="data.attributes.attr${nk}.modtype"><option value="Characteristic">Characteristic</option></select><input class="attribute-value" type="text" name="data.attributes.attr${nk}.value" value="0" data-dtype="Number" placeholder="0"/>`;
      form.appendChild(newKey);
      await this._onSubmit(event);
    }

    // Remove existing attribute
    else if (action === "delete") {
      const li = a.closest(".attribute");
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
    }
  }

  /**
   * Listen for click events on a filter control to modify the selected filter option.
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onClickFilterControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const filters = this._filters.skills;
    var filter = a.id;
    $(a).prop("checked", true);
    filters.filter = filter;
    await this._onSubmit(event);
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {
    // Handle the free-form attributes list
    const formAttrs = expandObject(formData).data.attributes || {};
    const attributes = Object.values(formAttrs).reduce((obj, v) => {
      let k = v["key"].trim();
      if (/[\s\.]/.test(k)) return ui.notifications.error("Attribute keys may not contain spaces or periods");
      delete v["key"];
      obj[k] = v;
      return obj;
    }, {});

    // Remove attributes which are no longer used
    for (let k of Object.keys(this.object.data.data.attributes)) {
      if (!attributes.hasOwnProperty(k)) attributes[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData)
      .filter((e) => !e[0].startsWith("data.attributes"))
      .reduce(
        (obj, e) => {
          obj[e[0]] = e[1];
          return obj;
        },
        { _id: this.object._id, "data.attributes": attributes }
      );

    // Update the Actor
    return this.object.update(formData);
  }

  async _rollSkillManual(skill, ability, difficulty) {
    const dicePool = new DicePoolFFG({
      ability: ability,
      difficulty: difficulty,
    });
    dicePool.upgrade(skill);
    await this._completeRollManual(dicePool, skillName);
  }

  async _rollSkill(event, upgradeType) {
    const data = this.getData();
    const row = event.target.parentElement.parentElement;
    const skillName = row.parentElement.dataset["ability"];
    const skill = data.data.skills[skillName];
    const characteristic = data.data.characteristics[skill.characteristic];

    const dicePool = new DicePoolFFG({
      ability: Math.max(characteristic.value, skill.rank),
      difficulty: 2, // Default to average difficulty
    });
    dicePool.upgrade(Math.min(characteristic.value, skill.rank));

    if (upgradeType === "ability") {
      dicePool.upgrade();
    } else if (upgradeType === "difficulty") {
      dicePool.upgradeDifficulty();
    }

    await this._completeRoll(dicePool, `Rolling ${skill.label}`, skill.label);
  }

  async _completeRoll(dicePool, description, skillName) {
    const id = randomID();

    const content = await renderTemplate("systems/starwarsffg/templates/roll-options.html", {
      dicePool,
      id,
    });

    new Dialog({
      title: description || "Finalize your roll",
      content,
      buttons: {
        one: {
          icon: '<i class="fas fa-check"></i>',
          label: "Roll",
          callback: () => {
            const container = document.getElementById(id);
            const finalPool = DicePoolFFG.fromContainer(container);

            ChatMessage.create({
              user: game.user._id,
              speaker: this.getData(),
              flavor: `Rolling ${skillName}...`,
              sound: CONFIG.sounds.dice,
              content: `/sw ${finalPool.renderDiceExpression()}`,
            });
          },
        },
        two: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
        },
      },
    }).render(true);
  }

  async _completeRollManual(dicePool, skillName) {
    ChatMessage.create({
      user: game.user._id,
      speaker: this.getData(),
      flavor: `Rolling ${skillName}...`,
      sound: CONFIG.sounds.dice,
      content: `/sw ${dicePool.renderDiceExpression()}`,
    });
  }

  _addSkillDicePool(elem) {
    const data = this.getData();
    const skillName = elem.dataset["ability"];
    const skill = data.data.skills[skillName];
    const characteristic = data.data.characteristics[skill.characteristic];

    const dicePool = new DicePoolFFG({
      ability: Math.max(characteristic.value, skill.rank),
    });
    dicePool.upgrade(Math.min(characteristic.value, skill.rank));

    const rollButton = elem.querySelector(".roll-button");
    dicePool.renderPreview(rollButton);
  }
}
