import { basic, core, itemattachments, qualities } from "./_templates.js";

export class GearData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      ...basic(),
      ...itemattachments(),
      ...qualities(),
    };
  }
}
