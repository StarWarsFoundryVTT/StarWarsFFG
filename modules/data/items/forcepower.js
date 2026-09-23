import { core } from "./_templates.js";
import { slotMap } from "../fields.js";

const fields = foundry.data.fields;

export class ForcePowerData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      upgrades: slotMap("upgrade", 16),
      required_force_rating: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      base_cost: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      // the upgrade tree's edit toggle, submitted as a hidden input on the sheet
      isEditing: new fields.BooleanField({ required: true, initial: false }),
    };
  }
}
