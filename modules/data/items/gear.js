import { basic, core, equippable, itemattachments, qualities, stowable } from "./_templates.js";

export class GearData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      ...basic(),
      ...stowable(),
      // gear was always treated as equipped, so it starts that way
      ...equippable({ equipped: true }),
      ...itemattachments(),
      ...qualities(),
    };
  }
}
