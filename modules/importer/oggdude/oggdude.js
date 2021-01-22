import Armor from "./importers/armor.js";
import Career from "./importers/careers.js";
import ForcePowers from "./importers/forcepowers.js";
import Gear from "./importers/gear.js";
import ItemAttachments from "./importers/item-attachments.js";
import ItemDescriptors from "./importers/item-descriptors.js";
import SignatureAbilities from "./importers/signature-abilities.js";
import Skills from "./importers/skills.js";
import Specializations from "./importers/specializations.js";
import Species from "./importers/species.js";
import Talents from "./importers/talents.js";
import Weapons from "./importers/weapons.js";

export default class OggDude {
  static Import = {
    Armor: Armor.Import,
    Career: Career.Import,
    ForcePowers: ForcePowers.Import,
    Gear: Gear.Import,
    ItemAttachments: ItemAttachments.Import,
    ItemDescriptors: ItemDescriptors.Import,
    SignatureAbilities: SignatureAbilities.Import,
    Skills: Skills.Import,
    Specializations: Specializations.Import,
    Species: Species.Import,
    Talents: Talents.Import,
    Weapons: Weapons.Import,
  };
}
