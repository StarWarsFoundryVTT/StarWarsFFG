import { basic, core, hardpoints, itemattachments, qualities } from "./_templates.js";

const fields = foundry.data.fields;

export class ItemAttachmentData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      ...basic(),
      ...hardpoints(),
      ...qualities(),
      ...itemattachments(),
      type: new fields.StringField({ required: true, initial: "all" }),
      // whether the attachment is installed - read when deciding if its modifiers apply
      active: new fields.BooleanField({ required: true, initial: false }),
    };
  }
}
