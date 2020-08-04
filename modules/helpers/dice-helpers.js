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

    const content = await renderTemplate("systems/starwarsffg/templates/roll-options.html", {
      dicePool,
      id,
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

              const roll = new game.ffg.RollFFG(finalPool.renderDiceExpression(), item);
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
    const skill = data.data.skills[skillName];
    const characteristic = data.data.characteristics[skill.characteristic];

    const dicePool = new DicePoolFFG({
      ability: Math.max(characteristic.value, skill.rank),
      boost: skill.boost,
      setback: skill.setback,
      remsetback: skill.remsetback,
      force: skill.force,
    });
    dicePool.upgrade(Math.min(characteristic.value, skill.rank));

    const rollButton = elem.querySelector(".roll-button");
    dicePool.renderPreview(rollButton);
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
}
