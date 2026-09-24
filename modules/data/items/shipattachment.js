import { basic, core, equippable, hardpoints, itemattachments, qualities } from "./_templates.js";

const fields = foundry.data.fields;

export class ShipAttachmentData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      ...basic(),
      ...hardpoints(),
      ...equippable(),
      ...itemattachments(),
      ...qualities(),
      label: new fields.StringField({ required: true, initial: "Ship Attachment" }),
      // both attachment importers write "vehicle" here; kept so that imported data survives, and
      // "all" to match what the one reader falls back to for an attachment made by hand
      type: new fields.StringField({ required: true, initial: "all" }),
    };
  }
}
