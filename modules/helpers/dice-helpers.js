import PopoutEditor from "../popout-editor.js";

export default class DiceHelpers {
  static async rollSkill(obj, event, type) {
    const data = obj.getData();
    const row = event.target.parentElement.parentElement;
    const skillName = row.parentElement.dataset["ability"];
    const skill = data.data.skills[skillName];
    const characteristic = data.data.characteristics[skill.characteristic];

    // Determine if this roll is triggered by an item.
    let item = {};
    if ($(row.parentElement).hasClass("item")) {
      let itemID = row.parentElement.dataset["itemId"];
      item = Object.entries(data.items).filter((item) => item[1]._id === itemID);
      item = item[0][1];
    }

    const dicePool = new DicePoolFFG({
      ability: Math.max(characteristic.value, skill.rank),
      boost: skill.boost,
      setback: skill.setback,
      force: skill.force,
      difficulty: 2, // default to average difficulty
    });

    dicePool.upgrade(Math.min(characteristic.value, skill.rank));

    if (type === "ability") {
      dicePool.upgrade();
    } else if (type === "difficulty") {
      dicePool.upgradeDifficulty();
    }

    this.displayRollDialog(data, dicePool, `${game.i18n.localize("SWFFG.Rolling")} ${skill.label}`, skill.label, item);
  }

  static async displayRollDialog(data, dicePool, description, skillName, item) {
    const id = randomID();

    const dicesymbols = {
      advantage: PopoutEditor.renderDiceImages("[AD]"),
      success: PopoutEditor.renderDiceImages("[SU]"),
      threat: PopoutEditor.renderDiceImages("[TH]"),
      failure: PopoutEditor.renderDiceImages("[FA]"),
      light: PopoutEditor.renderDiceImages("[LI]"),
      dark: PopoutEditor.renderDiceImages("[DA]"),
    };

    const content = await renderTemplate("systems/starwarsffg/templates/roll-options.html", {
      dicePool,
      id,
      dicesymbols,
    });

    new Dialog(
      {
        title: description || game.i18n.localize("SWFFG.RollingDefaultTitle"),
        content,
        buttons: {
          one: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize("SWFFG.ButtonRoll"),
            callback: () => {
              const container = document.getElementById(id);
              const finalPool = DicePoolFFG.fromContainer(container);

              const roll = new game.ffg.RollFFG(finalPool.renderDiceExpression(), item, finalPool);
              roll.toMessage({
                user: game.user._id,
                speaker: data,
                flavor: `${game.i18n.localize("SWFFG.Rolling")} ${skillName}...`,
              });
            },
          },
          two: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("SWFFG.Cancel"),
          },
        },
      },
      {
        classes: ["dialog", "starwarsffg"],
      }
    ).render(true);
  }

  static async addSkillDicePool(obj, elem) {
    const data = obj.getData();
    const skillName = elem.dataset["ability"];
    if (data.data.skills[skillName]) {
      const skill = data.data.skills[skillName];
      const characteristic = data.data.characteristics[skill.characteristic];

      const dicePool = new DicePoolFFG({
        ability: Math.max(characteristic.value, skill.rank),
        boost: skill.boost,
        setback: skill.setback,
        remsetback: skill.remsetback,
        force: skill.force,
        source: {
          skill: skill?.ranksource?.length ? skill.ranksource : [],
          boost: skill?.boostsource?.length ? skill.boostsource : [],
          remsetback: skill?.remsetbacksource?.length ? skill.remsetbacksource : [],
          setback: skill?.setbacksource?.length ? skill.setbacksource : [],
        },
      });
      dicePool.upgrade(Math.min(characteristic.value, skill.rank));

      const rollButton = elem.querySelector(".roll-button");
      dicePool.renderPreview(rollButton);
    }
  }

  static async rollItem(itemId, actorId) {
    const actor = game.actors.get(actorId);
    const actorSheet = actor.sheet.getData();

    const item = actor.getOwnedItem(itemId).data;

    const skill = actor.data.data.skills[item.data.skill.value];
    const characteristic = actor.data.data.characteristics[skill.characteristic];

    const dicePool = new DicePoolFFG({
      ability: Math.max(characteristic.value, skill.rank),
      boost: skill.boost,
      setback: skill.setback,
      force: skill.force,
      difficulty: 2, // default to average difficulty
    });

    dicePool.upgrade(Math.min(characteristic.value, skill.rank));

    this.displayRollDialog(actorSheet, dicePool, `${game.i18n.localize("SWFFG.Rolling")} ${skill.label}`, skill.label, item);
  }

  // Takes a skill object, characteristic object, difficulty number and ActorSheetFFG.getData() object and creates the appropriate roll dialog.
  static async rollSkillDirect(skill, characteristic, difficulty, sheet) {
    const dicePool = new DicePoolFFG({
      ability: Math.max(characteristic.value, skill.rank),
      boost: skill.boost,
      setback: skill.setback,
      force: skill.force,
      difficulty: difficulty,
    });

    dicePool.upgrade(Math.min(characteristic.value, skill.rank));

    this.displayRollDialog(sheet, dicePool, `${game.i18n.localize("SWFFG.Rolling")} ${skill.label}`, skill.label, null);
  }
}
