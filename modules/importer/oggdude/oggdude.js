import Armor from "./importers/armor.js";
import Career from "./importers/careers.js";
import Gear from "./importers/gear.js";
import SignatureAbilities from "./importers/signature-abilities.js";
import Skills from "./importers/skills.js";
import Species from "./importers/species.js";
import ItemDescriptors from "./importers/item-descriptors.js";

export default class OggDude {
  static Import = {
    Armor: Armor.Import,
    Career: Career.Import,
    Gear: Gear.Import,
    ItemDescriptors: ItemDescriptors.Import,
    SignatureAbilities: SignatureAbilities.Import,
    Skills: Skills.Import,
    Species: Species.Import,
  };
}
