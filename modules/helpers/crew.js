import {get_dice_pool} from "./dice-helpers.js";
import {DicePoolFFG} from "../dice/pool.js";

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
    // set up the flag data
    let flag_data = [];
    flag_data.push({
        'actor_id': drag_actor.id,
        'actor_name': drag_actor.name,
        'role': '(none)',
        'link':  await TextEditor.enrichHTML(drag_actor?.link) || null,
    });

    CONFIG.logger.debug("Looking up existing crew information");
    const existing_data = vehicle_actor.getFlag('starwarsffg', 'crew');
    if (existing_data !== undefined && existing_data !== null) {
        // we already have crew data defined, check if this actor is already in the data

        let overlapping_data = existing_data.filter(existing => existing.actor_id === drag_actor.id && existing.role === '(none)');
        if (overlapping_data.length !== 0) {
            // this actor is already in the crew; bail
            CONFIG.logger.debug("Actor is already in crew - not making any changes");
            return args;
        }
        CONFIG.logger.debug("Adding actor to vehicle crew without a role");
        flag_data = flag_data.concat(existing_data);
    }
    CONFIG.logger.debug(`Registering crew on vehicle ${vehicle_actor._id} - data: ${JSON.stringify(flag_data)}`)
    // set the flag data
    await vehicle_actor.setFlag('starwarsffg', 'crew', flag_data);
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
    const flag_data = vehicle_actor.getFlag('starwarsffg', 'crew');
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
      vehicle_actor.unsetFlag('starwarsffg', 'crew');
    } else {
      vehicle_actor.setFlag('starwarsffg', 'crew', new_flag_data);
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
    const flag_data = vehicle_actor.getFlag('starwarsffg', 'crew');
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
  const registeredRoles = game.settings.get('starwarsffg', 'arrayCrewRoles');
  // don't attempt to draw a roll for the initiative role
  const initiativeRole = game.settings.get('starwarsffg', 'initiativeCrewRole');
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
    const handling = vehicle?.system?.stats?.handling?.value;
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
