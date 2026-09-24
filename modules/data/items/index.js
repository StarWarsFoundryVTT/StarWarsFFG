import { AbilityData } from "./ability.js";
import { ArmourData } from "./armour.js";
import { BackgroundData } from "./background.js";
import { CareerData } from "./career.js";
import { CriticalDamageData } from "./criticaldamage.js";
import { CriticalInjuryData } from "./criticalinjury.js";
import { ForcePowerData } from "./forcepower.js";
import { GearData } from "./gear.js";
import { HomesteadUpgradeData } from "./homesteadupgrade.js";
import { ItemAttachmentData } from "./itemattachment.js";
import { ItemModifierData } from "./itemmodifier.js";
import { MotivationData } from "./motivation.js";
import { ObligationData } from "./obligation.js";
import { ShipAttachmentData } from "./shipattachment.js";
import { ShipWeaponData } from "./shipweapon.js";
import { SignatureAbilityData } from "./signatureability.js";
import { SpecializationData } from "./specialization.js";
import { SpeciesData } from "./species.js";
import { TalentData } from "./talent.js";
import { WeaponData } from "./weapon.js";

/**
 * The Data Model behind each Item subtype, registered on CONFIG.Item.dataModels during init
 */
export const ITEM_DATA_MODELS = {
  ability: AbilityData,
  armour: ArmourData,
  background: BackgroundData,
  career: CareerData,
  criticaldamage: CriticalDamageData,
  criticalinjury: CriticalInjuryData,
  forcepower: ForcePowerData,
  gear: GearData,
  homesteadupgrade: HomesteadUpgradeData,
  itemattachment: ItemAttachmentData,
  itemmodifier: ItemModifierData,
  motivation: MotivationData,
  obligation: ObligationData,
  shipattachment: ShipAttachmentData,
  shipweapon: ShipWeaponData,
  signatureability: SignatureAbilityData,
  specialization: SpecializationData,
  species: SpeciesData,
  talent: TalentData,
  weapon: WeaponData,
};
