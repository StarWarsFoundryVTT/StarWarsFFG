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
import Vehicles from "./importers/vehicles.js";
import Weapons from "./importers/weapons.js";
import Backgrounds from "./importers/backgrounds.js";
import Obligation from "./importers/obligation.js";

export default class OggDude {
  static Import = {
    Armor: Armor.Import,
    Career: Career.Import,
    ForcePower: ForcePowers.Import,
    Gear: Gear.Import,
    ItemAttachments: ItemAttachments.Import,
    ItemModifiers: ItemDescriptors.Import,
    SignatureAbility: SignatureAbilities.Import,
    Skills: Skills.Import,
    Specialization: Specializations.Import,
    Species: Species.Import,
    Talent: Talents.Import,
    Vehicle: Vehicles.Import,
    Weapon: Weapons.Import,
    Backgrounds: Backgrounds.Import,
    Obligations: Obligation.Import,
  };
  static Meta = {
    Armor: Armor.getMetaData(),
    Backgrounds: Backgrounds.getMetaData(),
    Career: Career.getMetaData(),
    // TODO: figure out how this works - uses multiple files/dirs
    // this._enableImportSelection(zip.files, "Force Abilities");
    ForcePowers: ForcePowers.getMetaData(),
    Gear: Gear.getMetaData(),
    ItemAttachments: ItemAttachments.getMetaData(),
    ItemModifiers: ItemDescriptors.getMetaData(),
    Obligations: Obligation.getMetaData(),
    SignatureAbilities: SignatureAbilities.getMetaData(),
    Skills: Skills.getMetaData(),
    Specializations: Specializations.getMetaData(),
    Species: Species.getMetaData(),
    Talents: Talents.getMetaData(),
    Vehicles: Vehicles.getMetaData(),
    Weapons: Weapons.getMetaData(),
  }
}
