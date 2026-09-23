import { core } from "./_templates.js";
import { slotMap } from "../fields.js";

const fields = foundry.data.fields;

export class SignatureAbilityData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      upgrades: slotMap("upgrade", 8),
      base_cost: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      uplink_nodes: slotMap("uplink", 4, () => false),
      // the upgrade tree's edit toggle, submitted as a hidden input on the sheet
      isEditing: new fields.BooleanField({ required: true, initial: false }),
    };
  }
}
