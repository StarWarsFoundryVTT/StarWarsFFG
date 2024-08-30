import {get_dice_pool} from "./dice-helpers.js";
import {DicePoolFFG} from "../dice/pool.js";
import DiceHelpers from "../helpers/dice-helpers.js";

/**
 * Capture a drag-and-drop event (used to capture adding crew members via a flag)
 * @param args - actor receiving the event, actor being dropped onto the recipient, ID of the actor being dropped on
 * @returns args - the input args (unmodified)
 */
export async function register_crew(...args) {
    CONFIG.logger.debug("Got possible register crew request");
    // check if this is an actor being dragged onto a vehicle
    let vehicle_actor;
    if (args[1].token) {
      // this is a token, not a real actor
      vehicle_actor = args[1].token?.actor;
      if (!vehicle_actor) {
        CONFIG.logger.debug("Not registering crew as entity is a token without a matching actor");
      }
    } else {
      vehicle_actor = args[0];
    }
    if (vehicle_actor.type !== 'vehicle' || args[2].type !== 'Actor') {
        // the target is not a vehicle or the actor being dragged onto it is a vehicle
        CONFIG.logger.debug("Not registering crew as item is not an actor or the target is not a vehicle");
        return args;
    }
    let drag_actor = null;
    if (args[2].hasOwnProperty('uuid')) {
        drag_actor = game.actors.get(args[2].uuid.split('.').pop());
    } else {
        drag_actor = game.actors.get(args[2].id);
    }
    if (drag_actor.type === 'vehicle') {
      CONFIG.logger.debug("Not registering crew as item is a vehicle");
      return args;
    }

    // prompt the user to select roles
    await selectRoles(vehicle_actor, drag_actor.id);
    return args;
}

/**
 * Remove a crew member + role pair from an actor
 * @param vehicle_actor actor object of the vehicle receiving the crew change
 * @param crew_member actor ID of the crew being changed
 * @param crew_role role of the crew to remove
 */
export function deregister_crew(vehicle_actor, crew_member, crew_role) {
    CONFIG.logger.debug("Got deregister crew request");
    const flag_data = vehicle_actor.getFlag('genesysk2', 'crew');
    let new_flag_data = [];

    for (let i = 0; i < flag_data.length; i++) {
        if (flag_data[i].actor_id !== crew_member) {
            new_flag_data.push(flag_data[i]);
        } else if (flag_data[i].actor_id === crew_member && flag_data[i].role !== crew_role) {
            new_flag_data.push(flag_data[i]);
        } else {
            CONFIG.logger.debug("skipping removed crew - old data:", flag_data[i]);
        }
    }

    CONFIG.logger.debug("Final updated flag data: ", new_flag_data);
    if (new_flag_data.length === 0) {
      // the last crew member was removed, delete the data
      vehicle_actor.unsetFlag('genesysk2', 'crew');
    } else {
      vehicle_actor.setFlag('genesysk2', 'crew', new_flag_data);
    }
}

/**
 *
 * @param vehicle_actor actor object of the vehicle receiving the crew change
 * @param crew_member actor ID of the crew being changed
 * @param old_crew_role old role of the crew member
 * @param new_crew_role new role of the crew member
 */
export async function change_role(vehicle_actor, crew_member, old_crew_role, new_crew_role) {
    CONFIG.logger.debug(
      `Got role change request: vehicle ID: ${vehicle_actor} | crew ID: ${crew_member} | old role: ${old_crew_role} | new role: ${new_crew_role}`
    );
    const flag_data = vehicle_actor.getFlag('genesysk2', 'crew');
    let new_flag_data = [];

    if (flag_data.filter(i => i.actor_id === crew_member && i.role === new_crew_role).length > 0) {
      CONFIG.logger.debug("Crew member already has same role, aborting");
      ui.notifications.warn(game.i18n.localize("SWFFG.Crew.Role.Duplicate"));
      return;
    }

    for (let i = 0; i < flag_data.length; i++) {
        if (flag_data[i].actor_id === crew_member && flag_data[i].role === old_crew_role) {
            flag_data[i].role = new_crew_role;
            new_flag_data.push(flag_data[i]);
        } else {
            new_flag_data.push(flag_data[i]);
        }
    }

    CONFIG.logger.debug("Final updated flag data: ", new_flag_data);
    // set the updated flag data
    vehicle_actor.setFlag('genesysk2', 'crew', new_flag_data);
}

/**
 * Set the roles of a crew member on a vehicle to a new array of roles (deleting any not in the new array)
 * @param vehicle_actor - actor object of the vehicle receiving the crew change
 * @param crew_member_id - actor ID of the crew member being changed
 * @param new_crew_roles - array of new roles for the crew member
 * @returns {Promise<void>}
 */
export async function updateRoles(vehicle_actor, crew_member_id, new_crew_roles) {
  const flag_data = vehicle_actor.getFlag('starwarsffg', 'crew') || [];
  let new_flag_data = [];
  const crew_member = game.actors.get(crew_member_id);

  for (let i = 0; i < flag_data.length; i++) {
      if (flag_data[i].actor_id === crew_member_id) {
        const crewIndex = new_crew_roles.indexOf(flag_data[i].role);
        if (crewIndex >= 0) {
          new_flag_data.push(flag_data[i]);
          new_crew_roles.splice(crewIndex, 1);
        }
      } else {
          new_flag_data.push(flag_data[i]);
      }
  }

  for (const newRole of new_crew_roles) {
    new_flag_data.push({
      'actor_id': crew_member.id,
      'actor_name': crew_member.name,
      'role': newRole,
      'link':  await TextEditor.enrichHTML(crew_member?.link) || null,
    });
  }

  CONFIG.logger.debug("Final updated flag data: ", new_flag_data);
  // set the updated flag data
  vehicle_actor.setFlag('starwarsffg', 'crew', new_flag_data);
}

/**
 * Create a string representation of a skill check for a crew member in a particular role on a vehicle
 * @param vehicle actor object for the vehicle the crew is on
 * @param crew_id actor ID of the crew member
 * @param crew_role role of the actor (used to determine which skill to use)
 * @returns {string|boolean} a string representation of HTML for the dice in the roll
 */
export function build_crew_roll(vehicle, crew_id, crew_role) {
  // look up the sheet for passing to the roller
  const crew_member = game.actors.get(crew_id);
  const vehicle_actor = game.actors.get(vehicle);
  if (crew_member === undefined) {
    ui.notifications.warn(game.i18n.localize("SWFFG.Crew.Actor.Removed"));
    deregister_crew(vehicle_actor, crew_id, crew_role);
    return false;
  }
  const starting_pool = {'difficulty': 0};
  const registeredRoles = game.settings.get('genesysk2', 'arrayCrewRoles');
  // don't attempt to draw a roll for the initiative role
  const initiativeRole = game.settings.get('genesysk2', 'initiativeCrewRole');
  if (crew_role === initiativeRole.role_name) {
    return false;
  }
  // look up the defined metadata for the assigned role
  const role_info = registeredRoles.filter(i => i.role_name === crew_role);
  // validate the role still exists in our settings
  if (role_info.length === 0) {
    ui.notifications.warn(game.i18n.localize("SWFFG.Crew.Role.Removed"));
    return false;
  }
  // validate that it's a valid role
  if (role_info[0].role_skill === undefined) {
    ui.notifications.warn(game.i18n.localize("SWFFG.Crew.Role.Invalid"));
    return false;
  }
  // check if the pool uses handling
  if (role_info[0].use_handling) {
    const handling = vehicle_actor?.system?.stats?.handling?.value;
    // add modifiers from the vehicle handling
    if (handling > 0) {
      starting_pool['boost'] = handling;
    } else if (handling < 0) {
      starting_pool['setback'] = handling * -1;
    }
  }
  let pool = new DicePoolFFG(starting_pool);
  pool = get_dice_pool(crew_id, role_info[0].role_skill, pool);
  return pool.renderPreview().innerHTML;
}

/**
 * Build the dice pool for the built-in piloting check, which automatically resolves the correct piloting skill
 * @param vehicle_id - the vehicle actor object
 * @param pilot_id - the actor ID of the pilot
 * @param difficulty - the difficulty of the check (omit to default to "average")
 * @returns {Promise<Window.DicePoolFFG>}
 */
export async function buildPilotRoll(vehicle_id, pilot_id, difficulty = 2) {
  const starting_pool = {'difficulty': difficulty};
  const vehicle = game.actors.get(vehicle_id);
  const skillTheme = game.settings.get("starwarsffg", "skilltheme");

  // add modifiers from the vehicle handling
  const handling = vehicle?.system?.stats?.handling?.value;
  if (handling > 0) {
    starting_pool['boost'] = handling;
  } else if (handling < 0) {
    starting_pool['setback'] = handling * -1;
  }

  // create the dice pool
  let pool = new DicePoolFFG(starting_pool);

  // determine if the vehicle is land or space
  let skill;
  if (vehicle?.system?.spaceShip) {
    if (skillTheme === "starwars") {
      skill = "Piloting: Space";
    } else {
      skill = "Piloting";
    }
  } else {
    if (skillTheme === "starwars") {
      skill = "Piloting: Planetary";
    } else {
      skill = "Driving";
    }
  }

  // update the pool with actor information
  return get_dice_pool(pilot_id, skill, pool);
}

/**
 * Create the dice pool and dialog window for the built-in piloting check
 * @param vehicle - the vehicle actor object
 * @param pilot_id - the actor ID of the pilot
 * @returns {Promise<void>}
 */
export async function handlePilotCheck(vehicle, pilot_id) {
  const crewSheet = game.actors.get(pilot_id)?.sheet;
  const pool = await buildPilotRoll(vehicle.id, pilot_id);

  // create chat card data
  const card_data = {
    "crew": {
      "name": vehicle.name,
      "img": vehicle.img,
      "crew_card": true,
      "role": "Pilot",
    }
  };

  // determine if the vehicle is land or space
  let skill;
  if (vehicle?.system?.spaceShip) {
    skill = "Piloting: Space";
  } else {
    skill = "Piloting: Planetary";
  }

  // open the roll dialog (skill name is already localized)
  await DiceHelpers.displayRollDialog(
    crewSheet,
    pool,
    `${game.i18n.localize("SWFFG.Rolling")} ${skill}`,
    skill,
    card_data
  );
}

export async function selectRoles(vehicle, crew_member_id) {
  const crew_member = game.actors.get(crew_member_id);
  const registeredRoles = game.settings.get('starwarsffg', 'arrayCrewRoles');
  const vehicleRoles = vehicle.getFlag('starwarsffg', 'crew') || [];

  const crewMemberRoles = vehicleRoles.filter(role => role.actor_id === crew_member_id);
  const rolesInUse = crewMemberRoles.map(role => role.role);

  const content = await renderTemplate(
    "systems/starwarsffg/templates/dialogs/ffg-crew-change.html",
    {
      actor: crew_member,
      roles: registeredRoles,
      rolesInUse: rolesInUse,
    }
  );

  new Dialog(
    {
      title: game.i18n.localize("SWFFG.Crew.Title"),
      content: content,
      buttons: {
        confirm: {
          label: 'Update Roles',
          callback: async (html) => {
            const newRoles = html.find('[name="select-many-things"]').val();
            await updateRoles(vehicle, crew_member_id, newRoles);
          }
        }
      }
    },
  ).render(true);
}
