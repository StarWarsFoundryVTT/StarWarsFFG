// Simple function for handling the creation of rollable weapon macros on hotbarDrop event.
export async function createFFGMacro(data, slot) {
  if (data.type !== "Transfer") return;
  if (data.data.type !== "weapon") return;

  if (!("data" in data)) return ui.notifications.warn("You can only create macro buttons for owned weapon items.");
  const item = data.data;
  // Create the macro command
  const command = `game.ffg.DiceHelpers.rollItem(\"${item._id}\", \"${data.actorId}\");`;
  let macro = game.macros.entities.find((m) => m.name === item.name && m.command === command);
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}
