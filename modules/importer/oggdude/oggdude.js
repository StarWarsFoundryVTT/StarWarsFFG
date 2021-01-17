import Skills from "./importers/skills.js";
import SignatureAbilities from "./importers/signature-abilities.js";
import ItemDescriptors from "./importers/item-descriptors.js";

export default class OggDude {
  static Import = {
    ItemDescriptors: ItemDescriptors.Import,
    SignatureAbilities: SignatureAbilities.Import,
    Skills: Skills.Import,
  };
}
