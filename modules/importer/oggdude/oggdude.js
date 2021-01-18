import Armor from "./importers/armor.js";
import Gear from "./importers/gear.js";
import Skills from "./importers/skills.js";
import SignatureAbilities from "./importers/signature-abilities.js";
import ItemDescriptors from "./importers/item-descriptors.js";

export default class OggDude {
  static Import = {
    Armor: Armor.Import,
    Gear: Gear.Import,
    ItemDescriptors: ItemDescriptors.Import,
    SignatureAbilities: SignatureAbilities.Import,
    Skills: Skills.Import,
  };
}
