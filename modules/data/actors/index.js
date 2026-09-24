import { CharacterData } from "./character.js";
import { HomesteadData } from "./homestead.js";
import { MinionData } from "./minion.js";
import { NemesisData } from "./nemesis.js";
import { RivalData } from "./rival.js";
import { VehicleData } from "./vehicle.js";

/**
 * The Data Model behind each Actor subtype, registered on CONFIG.Actor.dataModels during init.
 */
export const ACTOR_DATA_MODELS = {
  character: CharacterData,
  minion: MinionData,
  vehicle: VehicleData,
  homestead: HomesteadData,
  rival: RivalData,
  nemesis: NemesisData,
};
