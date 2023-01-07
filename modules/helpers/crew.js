/**
 * Capture a drag-and-drop event (used to capture adding crew members via a flag)
 * @param args - actor receiving the event, actor being dropped onto the recipient, ID of the actor being dropped on
 * @returns args - the input args (unmodified)
 */
export async function register_crew(...args) {
    CONFIG.logger.debug("Got possible register crew request");
    // check if this is an actor being dragged onto a vehicle
    let vehicle_actor = args[0];
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
    // set up the flag data
    let flag_data = [];
    flag_data.push({
        'actor_id': drag_actor.id,
        'actor_name': drag_actor.name,
        'role': '(none)',
    });

    CONFIG.logger.debug("Looking up existing crew information");
    let existing_data = vehicle_actor.getFlag('starwarsffg', 'crew');
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
    CONFIG.logger.debug("Flag data: ", flag_data)
    // set the flag data
    vehicle_actor.setFlag('starwarsffg', 'crew', flag_data);
    return args;
}

/**
 * Remove a crew member + role pair from an actor
 * @param vehicle_id actor ID of the vehicle receiving the crew change
 * @param crew_member actor ID of the crew being changed
 * @param crew_role role of the crew to remove
 */
export function deregister_crew(vehicle_id, crew_member, crew_role) {
    CONFIG.logger.debug("Got deregister crew request");
    let vehicle_actor = game.actors.get(vehicle_id);
    let flag_data = vehicle_actor.getFlag('starwarsffg', 'crew');
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

    if (new_flag_data.length === 0) {
        // the last crew member was removed, delete the data
        new_flag_data = null;
    }

    CONFIG.logger.debug("Final updated flag data: ", new_flag_data);
    // set the updated flag data
    vehicle_actor.setFlag('starwarsffg', 'crew', new_flag_data);
}

/**
 *
 * @param vehicle_id actor ID of the vehicle receiving the crew change
 * @param crew_member actor ID of the crew being changed
 * @param old_crew_role old role of the crew member
 * @param new_crew_role new role of the crew member
 */
export function change_role(vehicle_id, crew_member, old_crew_role, new_crew_role) {
    CONFIG.logger.debug("Got role change request: ", vehicle_id, crew_member, old_crew_role, new_crew_role);
    let vehicle_actor = game.actors.get(vehicle_id);
    let flag_data = vehicle_actor.getFlag('starwarsffg', 'crew');
    let new_flag_data = [];

    if (flag_data.filter(i => i.actor_id === crew_member && i.role === new_crew_role).length > 0) {
      CONFIG.logger.debug("Crew member already has same role, aborting");
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
