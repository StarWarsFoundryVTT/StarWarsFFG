const createMacroItem = async (macro) => {
  const macroExists = game.macros.find((m) => m.name === macro.name && m.command === macro.command);
  if (!macroExists) {
    return await Macro.create(macro);
  }

  return false;
};

// Simple function for handling the creation of rollable weapon macros on hotbarDrop event.
export async function createFFGMacro(bar, data, slot) {
  let macro;
  if (["Item", "Actor"].includes(data.type)) {
    const entity = await fromUuid(data.uuid);
    if (!entity) {
      return;
    }
    if (entity.type === "weapon") {
      let command;
      if (!entity?.flags?.starwarsffg?.ffgIsOwned) {
        command = `await Hotbar.toggleDocumentSheet("${data.uuid}");`;
      } else {
        command = `
      game.ffg.DiceHelpers.rollItem(\"${item._id}\", \"${entity.actorId}\");
      `;
      }
      macro = await createMacroItem({
        name: entity.name,
        type: "script",
        img: entity.img,
        command: command,
      });
    } else if (entity.type === "skill") {
      const actor = game.actors.get(data.actorId);
      const command = `
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


  } else if (data.type === "Transfer") {
    if (data.data.type !== "weapon" && data.data.type !== "skill") {
      return;
    }
    if (data.data.type === "weapon") {
      if (!("data" in data)) return ui.notifications.warn("You can only create macro buttons for owned weapon items.");
      const item = data.data;
      // Create the macro command
      const command = `
    game.ffg.DiceHelpers.rollItem(\"${item._id}\", \"${data.actorId}\");
    `;
      macro = await createMacroItem({
        name: `Attack with ${item.name}`,
        type: "script",
        img: item.img,
        command: command,
      });
    }
  } else if (data?.data?.type === "skill") {
      const actor = game.actors.get(data.actorId);
      const command = `
    // game.ffg.DiceHelpers.rollSkillDirect(skill, characteristic, difficulty, actorSheet, flavortext, sound);
    const ffgactor = game.actors.get("${data.actorId}");
    const skill = ffgactor.system.skills["${data.data.skill}"];
    const characteristic = ffgactor.system.characteristics["${data.data.characteristic}"];
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

/**
 * Update a macro with the image of the entity in the macro
 * @param macro
 * @returns {Promise<*>}
 */
export async function updateMacro(macro) {
  let uuid = macro.command.split("\"");
  if (uuid.length >= 1) {
    const document = await fromUuid(uuid[1]);
    if (document?.img) {
      macro.img = document?.img;
      await macro.update({img: document.img});
    }
  }
  return macro;
}
