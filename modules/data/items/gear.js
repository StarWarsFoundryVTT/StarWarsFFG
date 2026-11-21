import { basic, core, itemattachments, qualities, stowable } from "./_templates.js";

export class GearData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      ...basic(),
      ...stowable(),
      ...itemattachments(),
      ...qualities(),
    };
  }
}
