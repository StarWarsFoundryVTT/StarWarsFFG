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
    html.find(".roll-button").click((event) => {
      this._rollSkill(event);
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

  _rollSkill(event) {
    const data = this.getData();
    const row = event.target.parentElement.parentElement;
    const skillName = row.dataset["ability"];
    const skill = data.data.skills[skillName];
    const characteristic = data.data.characteristics[skill.characteristic];
    const ranks = skill.value;
    let proficiency = 0;
    let ability = 0;

    if (ranks <= characteristic.value) {
      proficiency = ranks;
      ability = characteristic.value - ranks;
    }
    // TODO: Properly handle upgrading skills
    new Dialog({
      title: "Finalize your roll",
      // We set the default difficulty to average here.
      content: `
Enter extra dice<br>
<table>
  <tr>
    <td>Difficulty</td>
    <td><input type="number" id="difficulty-dice" name="difficulty" min="0" value="2"></td>
  </tr>
  <tr>
    <td>Challenge</td>
    <td><input type="number" id="challenge-dice" name="challenge" min="0" value="0"></td>
  </tr>
  <tr>
    <td>Boost</td>
    <td><input type="number" id="boost-dice" name="boost" min="0" value="0"></td>
  </tr>
  <tr>
    <td>Setback</td>
    <td><input type="number" id="setback-dice" name="setback" min="0" value="0"></td>
  </tr>
  <tr>
    <td>Force</td>
    <td><input type="number" id="force-dice" name="force" min="0" value="0"></td>
  </tr>
</table>
`,
      buttons: {
        one: {
          icon: '<i class="fas fa-check"></i>',
          label: "Roll",
          callback: () => {
            const boost = document.getElementById("boost-dice").value;
            const setback = document.getElementById("setback-dice").value;
            const difficulty = document.getElementById("difficulty-dice").value;
            const challenge = document.getElementById("challenge-dice").value;
            const force = document.getElementById("force-dice").value;

            const diceExpr = [
              "a".repeat(ability),
              "p".repeat(proficiency),
              "b".repeat(boost),
              "s".repeat(setback),
              "d".repeat(difficulty),
              "c".repeat(challenge),
              "f".repeat(force)
            ].join("");

            ChatMessage.create({
              user: game.user._id,
              speaker: data,
              content: `/sw ${diceExpr}`
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
