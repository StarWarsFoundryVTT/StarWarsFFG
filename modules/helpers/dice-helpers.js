import PopoutEditor from "../popout-editor.js";
import RollBuilderFFG from "../dice/roll-builder.js";
import ModifierHelpers from "../helpers/modifiers.js";

export default class DiceHelpers {
  static async rollSkill(obj, event, type, flavorText, sound) {
    const data = obj.getData();
    const row = event.target.parentElement.parentElement;
    const skillName = row.parentElement.dataset["ability"];

    let skills;
    const theme = await game.settings.get("starwarsffg", "skilltheme");
    try {
      skills = JSON.parse(JSON.stringify(CONFIG.FFG.alternateskilllists.find((list) => list.id === theme).skills));
    } catch (err) {
      // if we run into an error use the default starwars skill set
      skills = JSON.parse(JSON.stringify(CONFIG.FFG.alternateskilllists.find((list) => list.id === "starwars").skills));
      CONFIG.logger.warn(`Unable to load skill theme ${theme}, defaulting to starwars skill theme`, err);
    }

    let skill = {
      rank: 0,
      characteristic: "",
      boost: 0,
      setback: 0,
      force: 0,
      advantage: 0,
      dark: 0,
      light: 0,
      failure: 0,
      threat: 0,
      success: 0,
      label: skills?.[skillName]?.label ? game.i18n.localize(skills[skillName].label) : game.i18n.localize(CONFIG.FFG.skills[skillName].label),
    };
    let characteristic = {
      value: 0,
    };

    if (data?.data?.skills?.[skillName]) {
      skill = data.data.skills[skillName];
    }
    if (data?.data?.characteristics?.[skill?.characteristic]) {
      characteristic = data.data.characteristics[skill.characteristic];
    }

    const actor = await game.actors.get(data.actor._id);

    // Determine if this roll is triggered by an item.
    let item = {};
    if ($(row.parentElement).hasClass("item")) {
      let itemID = row.parentElement.dataset["itemId"];
      const item1 = actor.getOwnedItem(itemID);
      item = Object.entries(data.items).filter((item) => item[1]._id === itemID);
      item = item[0][1];
      item.flags.uuid = item1.uuid;
    }

    let itemStatusSetback = 0;

    if (item.type === "weapon" && item?.data?.status && item.data.status !== "None") {
      const status = CONFIG.FFG.itemstatus[item.data.status].attributes.find((i) => i.mod === "Setback");

      if (status.value < 99) {
        itemStatusSetback = status.value;
      } else {
        ui.notifications.error(`${item.name} ${game.i18n.localize("SWFFG.ItemTooDamagedToUse")} (${game.i18n.localize(CONFIG.FFG.itemstatus[item.data.status].label)}).`);
        return;
      }
    }

    // TODO: Get weapon specific modifiers from itemmodifiers and itemattachments

    const dicePool = new DicePoolFFG({
      ability: Math.max(characteristic.value, skill.rank),
      boost: skill.boost,
      setback: skill.setback + itemStatusSetback,
      force: skill.force,
      advantage: skill.advantage,
      dark: skill.dark,
      light: skill.light,
      failure: skill.failure,
      threat: skill.threat,
      success: skill.success,
      difficulty: 2, // default to average difficulty
    });

    dicePool.upgrade(Math.min(characteristic.value, skill.rank));

    if (type === "ability") {
      dicePool.upgrade();
    } else if (type === "difficulty") {
      dicePool.upgradeDifficulty();
    }

    if (item.type === "weapon") {
      if (item?.data?.itemattachment) {
        item.data.itemattachment.forEach((attachment) => {
          //get base mods and additional mods totals
          const activeModifiers = attachment.data.itemmodifier.filter((i) => i.data?.active);

          dicePool.boost += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "Add Boost", "Roll Modifiers");
          dicePool.setback += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "Add Setback", "Roll Modifiers");
          dicePool.advantage += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "Add Advantage", "Result Modifiers");
          dicePool.dark += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "Add Dark", "Result Modifiers");
          dicePool.failure += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "Add Failure", "Result Modifiers");
          dicePool.light += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "Add Light", "Result Modifiers");
          dicePool.success += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "Add Success", "Result Modifiers");
          dicePool.threat += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "Add Threat", "Result Modifiers");

          dicePool.difficulty += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "Add Difficulty", "Dice Modifiers");
          dicePool.upgradeDifficulty(ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "Upgrade Difficulty", "Dice Modifiers"));
          dicePool.upgradeDifficulty(-1 * ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "Downgrade Difficulty", "Dice Modifiers"));
          dicePool.upgrade(ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "Upgrade Difficulty", "Dice Ability"));
          dicePool.upgrade(-1 * ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "Downgrade Difficulty", "Dice Ability"));
        });
      }
    }

    this.displayRollDialog(data, dicePool, `${game.i18n.localize("SWFFG.Rolling")} ${skill.label}`, skill.label, item, flavorText, sound);
  }

  static async displayRollDialog(data, dicePool, description, skillName, item, flavorText, sound) {
    new RollBuilderFFG(data, dicePool, description, skillName, item, flavorText, sound).render(true);
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
        advantage: skill.advantage,
        dark: skill.dark,
        light: skill.light,
        failure: skill.failure,
        threat: skill.threat,
        success: skill.success,
        source: {
          skill: skill?.ranksource?.length ? skill.ranksource : [],
          boost: skill?.boostsource?.length ? skill.boostsource : [],
          remsetback: skill?.remsetbacksource?.length ? skill.remsetbacksource : [],
          setback: skill?.setbacksource?.length ? skill.setbacksource : [],
          advantage: skill?.advantagesource?.length ? skill.advantagesource : [],
          dark: skill?.darksource?.length ? skill.darksource : [],
          light: skill?.lightsource?.length ? skill.lightsource : [],
          failure: skill?.failuresource?.length ? skill.failuresource : [],
          threat: skill?.threatsource?.length ? skill.threatsource : [],
          success: skill?.successsource?.length ? skill.successsource : [],
        },
      });
      dicePool.upgrade(Math.min(characteristic.value, skill.rank));

      const rollButton = elem.querySelector(".roll-button");
      dicePool.renderPreview(rollButton);
    }
  }

  static async rollItem(itemId, actorId, flavorText, sound) {
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
      advantage: skill.advantage,
      dark: skill.dark,
      light: skill.light,
      failure: skill.failure,
      threat: skill.threat,
      success: skill.success,
      difficulty: 2, // default to average difficulty
    });

    dicePool.upgrade(Math.min(characteristic.value, skill.rank));

    this.displayRollDialog(actorSheet, dicePool, `${game.i18n.localize("SWFFG.Rolling")} ${skill.label}`, skill.label, item, flavorText, sound);
  }

  // Takes a skill object, characteristic object, difficulty number and ActorSheetFFG.getData() object and creates the appropriate roll dialog.
  static async rollSkillDirect(skill, characteristic, difficulty, sheet, flavorText, sound) {
    const dicePool = new DicePoolFFG({
      ability: Math.max(characteristic.value, skill.rank),
      boost: skill.boost,
      setback: skill.setback,
      force: skill.force,
      difficulty: difficulty,
      advantage: skill.advantage,
      dark: skill.dark,
      light: skill.light,
      failure: skill.failure,
      threat: skill.threat,
      success: skill.success,
    });

    dicePool.upgrade(Math.min(characteristic.value, skill.rank));

    this.displayRollDialog(sheet, dicePool, `${game.i18n.localize("SWFFG.Rolling")} ${skill.label}`, skill.label, null, flavorText, sound);
  }
}
