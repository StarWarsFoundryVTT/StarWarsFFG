import Skills from "./importers/skills.js";
import SignatureAbilities from "./importers/signature-abilities.js";

export default class OggDude {
  static Import = {
    Skills: Skills.Import,
    SignatureAbilities: SignatureAbilities.Import,
  };
}
