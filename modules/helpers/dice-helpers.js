import PopoutEditor from "../popout-editor.js";
import RollBuilderFFG from "../dice/roll-builder.js";
import ModifierHelpers from "../helpers/modifiers.js";
import ImportHelpers from "../importer/import-helpers.js";

export default class DiceHelpers {
  static async rollSkill(obj, event, type, flavorText, sound) {
    const data = obj.getData();
    const row = event.target.parentElement.parentElement;
    let skillName = row.parentElement.dataset["ability"];
    if (skillName === undefined) {
      skillName = row.dataset["ability"];
    }

    let skills;
    const theme = await game.settings.get("genesysk2", "skilltheme");
    try {
      skills = JSON.parse(JSON.stringify(CONFIG.FFG.alternateskilllists.find((list) => list.id === theme).skills));
    } catch (err) {
      // if we run into an error use the default starwars skill set
      skills = JSON.parse(JSON.stringify(CONFIG.FFG.alternateskilllists.find((list) => list.id === "starwars").skills));
      CONFIG.logger.warn(`Unable to load skill theme ${theme}, defaulting to starwars skill theme`, err);
    }

    let skillData = skills?.[skillName];

    if (!skillData) {
      skillData = data.data[skillName];
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
      triumph: 0,
      despair: 0,
      upgrades: 0,
      label: skillData?.label ? game.i18n.localize(skillData.label) : game.i18n.localize(skillName),
    };
    let characteristic = {
      value: 0
    };

    if (data?.data?.skills?.[skillName]) {
      skill = data.data.skills[skillName];
    }
    if (data?.data?.characteristics?.[skill?.characteristic]) {
      characteristic = data.data.characteristics[skill.characteristic];
    }

    const actor = await game.actors.get(data.actor._id);

    // Determine if this roll is triggered by an item.
    let item;
    if ($(row.parentElement).hasClass("item")) {
      //Check if token is linked to actor
      if (obj.actor.token === null) {
        let itemID = row.parentElement.dataset["itemId"];
        item = actor.items.get(itemID);
      } else {
        //Rolls this if unlinked
        let itemID = row.parentElement.dataset["itemId"];
        item = obj.actor.token.actor.items.get(itemID);
      }
    }
    const itemData = item || {};
    const status = this.getWeaponStatus(itemData);

    // TODO: Get weapon specific modifiers from itemmodifiers and itemattachments

    let dicePool = new DicePoolFFG({
      ability: Math.max(characteristic.value, skill.rank),
      boost: skill.boost,
      setback: skill.setback + status.setback,
      force: skill.force,
      advantage: skill.advantage,
      dark: skill.dark,
      light: skill.light,
      failure: skill.failure,
      threat: skill.threat,
      success: skill.success,
      triumph: skill.triumph,
      despair: skill.despair,
      upgrades: skill.upgrades,
      difficulty: 2 + status.difficulty, // default to average difficulty
    });
    
    dicePool.upgrade(Math.min(characteristic.value, skill.rank) + dicePool.upgrades);

    if (type === "ability") {
      dicePool.upgrade();
    } else if (type === "difficulty") {
      dicePool.upgradeDifficulty();
    }

    dicePool = new DicePoolFFG(await this.getModifiers(dicePool, itemData));
    this.displayRollDialog(data, dicePool, `${game.i18n.localize("SWFFG.Rolling")} ${game.i18n.localize(skill.label)}`, skill.label, itemData, flavorText, sound);
  }

  static async displayRollDialog(data, dicePool, description, skillName, item, flavorText, sound) {
    return new RollBuilderFFG(data, dicePool, description, skillName, item, flavorText, sound).render(true);
  }

  static async addSkillDicePool(obj, elem) {
    const data = obj.getData();
    const skillName = elem.dataset["ability"];
    if (data.data.skills[skillName]) {
      const skill = data.data.skills[skillName];
      const characteristic = data.data.characteristics[skill.characteristic];

      const dicePool = new DicePoolFFG({
        ability: Math.max(characteristic?.value ? characteristic.value : 0, skill?.rank ? skill.rank : 0),
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
        triumph: skill?.triumph ? skill.triumph : 0,
        despair: skill?.despair ? skill.despair : 0,
        upgrades: skill?.upgrades ? skill.upgrades : 0,
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
          upgrades: skill?.upgradessource?.length ? skill.upgradessource: [],
        },
      });
            
      dicePool.upgrade(Math.min(characteristic.value, skill.rank) + dicePool.upgrades);

      const rollButton = elem.querySelector(".roll-button");
      dicePool.renderPreview(rollButton);
    }
  }

  static async rollItem(itemId, actorId, flavorText, sound) {
    const actor = game.actors.get(actorId);
    const actorSheet = actor.sheet.getData();

    const item = actor.items.get(itemId);
    const itemData = item.system;
    await item.setFlag("starwarsffg", "uuid", item.uuid);

    const status = this.getWeaponStatus(item);

    const skill = actor.system.skills[itemData.skill.value];
    const characteristic = actor.system.characteristics[skill.characteristic];

    let dicePool = new DicePoolFFG({
      ability: Math.max(characteristic.value, skill.rank),
      boost: skill.boost,
      setback: skill.setback + status.setback,
      force: skill.force,
      advantage: skill.advantage,
      dark: skill.dark,
      light: skill.light,
      failure: skill.failure,
      threat: skill.threat,
      success: skill.success,
      triumph: skill?.triumph ? skill.triumph : 0,
      despair: skill?.despair ? skill.despair : 0,
      upgrades: skill?.upgrades ? skill.upgrades : 0,
      difficulty: 2 + status.difficulty, // default to average difficulty
    });

    dicePool.upgrade(Math.min(characteristic.value, skill.rank) + dicePool.upgrades);

    dicePool = new DicePoolFFG(await this.getModifiers(dicePool, item));

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
      triumph: skill?.triumph ? skill.triumph : 0,
      despair: skill?.despair ? skill.despair : 0,
      upgrades: skill?.upgrades ? skill.upgrades : 0,
    });

    dicePool.upgrade(Math.min(characteristic.value, skill.rank) + dicePool.upgrades);

    this.displayRollDialog(sheet, dicePool, `${game.i18n.localize("SWFFG.Rolling")} ${skill.label}`, skill.label, {}, flavorText, sound);
  }

  static getWeaponStatus(item) {
    let setback = 0;
    let difficulty = 0;

    if (item.type === "weapon" && item?.system?.status && item.system.status !== "None") {
      const status = CONFIG.FFG.itemstatus[item.system.status].attributes.find((i) => i.mod === "Setback");

      if (status.value < 99) {
        if (status.value === 1) {
          setback = status.value;
        } else {
          difficulty = 1;
        }
      } else {
        ui.notifications.error(`${item.name} ${game.i18n.localize("SWFFG.ItemTooDamagedToUse")} (${game.i18n.localize(CONFIG.FFG.itemstatus[item.system.status].label)}).`);
        return;
      }
    }

    return { setback, difficulty };
  }

  static async getModifiers(dicePool, item) {
    if (item.type === "weapon" || item.type === "shipweapon") {
      dicePool = await ModifierHelpers.getDicePoolModifiers(dicePool, item, []);

      if (item?.system?.itemattachment) {
        await ImportHelpers.asyncForEach(item.system.itemattachment, async (attachment) => {
          //get base mods and additional mods totals
          const activeModifiers = attachment.system.itemmodifier.filter((i) => i.system?.active);

          dicePool = await ModifierHelpers.getDicePoolModifiers(dicePool, attachment, activeModifiers);
        });
      }
      if (item?.system?.itemmodifier) {
        await ImportHelpers.asyncForEach(item.system.itemmodifier, async (modifier) => {
          dicePool = await ModifierHelpers.getDicePoolModifiers(dicePool, modifier, []);
        });
      }
    }

    return dicePool;
  }
}

/**
 * Helper function to build a dice pool
 * @param actor_id ID of the actor making the check
 * @param skill_name name of the string of the skill
 * @param incoming_roll existing dice, e.g. difficulty dice
 * @returns {DicePoolFFG}
 */
export function get_dice_pool(actor_id, skill_name, incoming_roll) {
  const actor = game.actors.get(actor_id);
  const parsed_skill_name = convert_skill_name(skill_name);
  const skill = actor.system.skills[parsed_skill_name];
  const characteristic = actor.system.characteristics[skill.characteristic];

  const dicePool = new DicePoolFFG({
    ability: (Math.max(characteristic.value, skill.rank) + incoming_roll.ability) - (Math.min(characteristic.value, skill.rank) + incoming_roll.proficiency),
    proficiency: Math.min(characteristic.value, skill.rank) + incoming_roll.proficiency,
    boost: skill.boost + incoming_roll.boost,
    setback: skill.setback + incoming_roll.setback,
    force: skill.force + incoming_roll.force,
    advantage: skill.advantage + incoming_roll.advantage,
    dark: skill.dark + incoming_roll.dark,
    light: skill.light + incoming_roll.light,
    failure: skill.failure + incoming_roll.failure,
    threat: skill.threat + incoming_roll.threat,
    success: skill.success + incoming_roll.success,
    triumph: skill.triumph + incoming_roll.triumph,
    despair: skill.despair + incoming_roll.despair,
    upgrades: skill.upgrades + incoming_roll.upgrades,
    difficulty: +incoming_roll.difficulty,
  });
  return dicePool;
}

/**
 * Convert the skill name to how the game handles it
 * @param pool_skill_name skill name to be converted
 * @returns {null|string}
 */
function convert_skill_name(pool_skill_name) {
  CONFIG.logger.debug(`Converting ${pool_skill_name} to skill name`);
  const skills = CONFIG.FFG.skills;
  for (var skill in skills) {
    if (skills[skill]['label'] === pool_skill_name) {
      CONFIG.logger.debug(`Found mapping to ${skill}`);
      return skill;
    }
  }
  // it would appear that sometimes it's value instead of label
  for (var skill in skills) {
    if (skills[skill]['value'] === pool_skill_name) {
      CONFIG.logger.debug(`Found mapping to ${skill}`);
      return skill;
    }
  }
  CONFIG.logger.debug('WARNING: Found no mapping!');
  return null;
}
