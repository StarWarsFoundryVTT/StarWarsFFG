/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class ActorSheetFFG extends ActorSheet {

  /** @override */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
  	  classes: ["worldbuilding", "sheet", "actor"],
  	  template: "systems/starwarsffg/templates/ffg-actor-sheet.html",
      width: 600,
      height: 600,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "characteristics"}]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];
    for ( let attr of Object.values(data.data.attributes) ) {
      attr.isCheckbox = attr.dtype === "Boolean";
    }
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

    // Activate tabs
    let tabs = html.find('.tabs');
    let initial = this._sheetTab;
    new Tabs(tabs, {
      initial: initial,
      callback: clicked => this._sheetTab = clicked.data("tab")
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // Roll Skill
    html.find(".roll-button").click(async (event) => {
      let upgradeType = null;
      if (event.ctrlKey && !event.shiftKey) {
        upgradeType = "ability"
      } else if (!event.ctrlKey && event.shiftKey) {
        upgradeType = "difficulty";
      }
      await this._rollSkill(event, upgradeType);
    });

    // Add or Remove Attribute
    html.find(".attributes").on("click", ".attribute-control", this._onClickAttributeControl.bind(this));
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
    if ( action === "create" ) {
      const nk = Object.keys(attrs).length + 1;
      let newKey = document.createElement("div");
      newKey.innerHTML = `<input type="text" name="data.attributes.attr${nk}.key" value="attr${nk}"/>`;
      newKey = newKey.children[0];
      form.appendChild(newKey);
      await this._onSubmit(event);
    }

    // Remove existing attribute
    else if ( action === "delete" ) {
      const li = a.closest(".attribute");
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {

    // Handle the free-form attributes list
    const formAttrs = expandObject(formData).data.attributes || {};
    const attributes = Object.values(formAttrs).reduce((obj, v) => {
      let k = v["key"].trim();
      if ( /[\s\.]/.test(k) )  return ui.notifications.error("Attribute keys may not contain spaces or periods");
      delete v["key"];
      obj[k] = v;
      return obj;
    }, {});

    // Remove attributes which are no longer used
    for ( let k of Object.keys(this.object.data.data.attributes) ) {
      if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].startsWith("data.attributes")).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {_id: this.object._id, "data.attributes": attributes});

    // Update the Actor
    return this.object.update(formData);
  }

  async _rollSkill(event, upgradeType) {
    const data = this.getData();
    const row = event.target.parentElement.parentElement;
    const skillName = row.dataset["ability"];
    const skill = data.data.skills[skillName];
    const characteristic = data.data.characteristics[skill.characteristic];

    const dicePool = new DicePoolFFG({
      ability: characteristic.value,
      difficulty: 2 // Default to average difficulty
    });
    dicePool.upgrade(skill.value);

    if (upgradeType === "ability") {
      dicePool.upgrade();
    }  else if (upgradeType === "difficulty") {
      dicePool.upgradeDifficulty()
    }

    await this._completeRoll(dicePool, `Rolling ${skillName}`);
  }

  async _completeRoll(dicePool, description) {
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
              content: `/sw ${finalPool.renderDiceExpression()}`
            });
          }
        },
        two: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
        }
      },
    }).render(true)
  }
}
