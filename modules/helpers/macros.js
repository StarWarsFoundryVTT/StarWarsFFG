const createMacroItem = async (macro) => {
  const macroExists = game.macros.find((m) => m.name === macro.name && m.command === macro.command);
  if (!macroExists) {
    return await Macro.create(macro);
  }

  return false;
};

// Simple function for handling the creation of rollable weapon macros on hotbarDrop event.
export async function createFFGMacro(data, slot) {
  if (data.type !== "Transfer" && data.type !== "CreateMacro") return;
  if (data.data.type !== "weapon" && data.data.type !== "skill") return;

  let macro;
  if (data.data.type === "weapon") {
    if (!("data" in data)) return ui.notifications.warn("You can only create macro buttons for owned weapon items.");
    const item = data.data;
    // Create the macro command
    const command = `
    // game.ffg.DiceHelpers.rollItem(itemid, actorid, flavortext, sound);
    game.ffg.DiceHelpers.rollItem(\"${item._id}\", \"${data.actorId}\");
    `;
    macro = await createMacroItem({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
    });
  } else if (data.data.type === "skill") {
    const actor = game.actors.get(data.actorId);
    const command = `
    // game.ffg.DiceHelpers.rollSkillDirect(skill, characteristic, difficulty, actorSheet, flavortext, sound);
    const ffgactor = game.actors.get("${data.actorId}");
    const skill = ffgactor.data.data.skills["${data.data.skill}"];
    const characteristic = ffgactor.data.data.characteristics["${data.data.characteristic}"];
    const actorSheet = ffgactor.sheet.getData();
    game.ffg.DiceHelpers.rollSkillDirect(skill, characteristic, 2, actorSheet);`;
    macro = await createMacroItem({
      name: `${actor.name}-${data.data.skill}`,
      type: "script",
      command: command,
    });
  }

  if (macro) {
    game.user.assignHotbarMacro(macro, slot);
  }

  return false;
}
