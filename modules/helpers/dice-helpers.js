export default class DiceHelpers {
  static async rollSkill (obj, event, type) {
    const data = obj.getData();
    const row = event.target.parentElement.parentElement;
    const skillName = row.parentElement.dataset["ability"];
    const skill = data.data.skills[skillName];
    const characteristic = data.data.characteristics[skill.characteristic];

    const dicePool = new DicePoolFFG({
      ability : Math.max(characteristic.value, skill.rank),
      difficulty: 2 // default to average difficulty
    });

    dicePool.upgrade(Math.min(characteristic.value, skill.rank));

    if(type === "ability") {
      dicePool.upgrade();
    } else if (type === "difficulty") {
      dicePool.upgradeDifficulty();
    }

    this.displayRollDialog(data, dicePool, `${game.i18n.localize("SWFFG.Rolling")} ${skill.label}`, skill.label)
  }

  static async displayRollDialog(data, dicePool, description, skillName) {
    const id = randomID();

    const content = await renderTemplate("systems/starwarsffg/templates/roll-options.html", {
      dicePool,
      id,
    });

    new Dialog({
      title: description || game.i18n.localize("SWFFG.RollingDefaultTitle"),
      content,
      buttons: {
        one: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("SWFFG.ButtonRoll"),
          callback: () => {
            const container = document.getElementById(id);
            const finalPool = DicePoolFFG.fromContainer(container);

            const message = game.specialDiceRoller.starWars.rollFormula(finalPool.renderDiceExpression());
            ChatMessage.create({
              user: game.user._id,
              speaker: data,
              flavor: `${game.i18n.localize("SWFFG.Rolling")} ${skillName}...`,
              sound: CONFIG.sounds.dice,
              content: message,
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
      classes: ["dialog", "starwarsffg"]
    }).render(true);
  }
}