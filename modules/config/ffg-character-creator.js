export const rules = {
  "Force and Destiny": {
    "value": "fad",
    "label": "SWFFG.CharacterCreator.Rules.fad",
  },
  "Age of Rebellion": {
    "value": "aor",
    "label": "SWFFG.CharacterCreator.Rules.aor",
  },
  "Edge of the Empire": {
    "value": "eote",
    "label": "SWFFG.CharacterCreator.Rules.eote",
  },
};

const backgroundTypes = {
  "Cultural": {
    "value": "culture",
    "label": "SWFFG.CharacterCreator.Background.culture",
  },
  "the Force": {
    "value": "force",
    "label": "SWFFG.CharacterCreator.Background.force",
  },
  "Hook": {
    "value": "hook",
    "label": "SWFFG.CharacterCreator.Background.hook",
  },
};

const obligationTypes = {
  "Duty": {
    "value": "duty",
    "label": "SWFFG.CharacterCreator.Obligation.duty",
  },
  "Obligation": {
    "value": "obligation",
    "label": "SWFFG.CharacterCreator.Obligation.obligation",
  },
  "Morality": {
    "value": "morality",
    "label": "SWFFG.CharacterCreator.Obligation.morality",
  },
};

const startingBonusesRadio = {
  "aor": {
    "5xp": "SWFFG.CharacterCreator.startingBonus.aor.5xp",
    "10xp": "SWFFG.CharacterCreator.startingBonus.aor.10xp",
    "1k_credits": "SWFFG.CharacterCreator.startingBonus.aor.1k_credits",
    "2k_credits": "SWFFG.CharacterCreator.startingBonus.aor.2k_credits",
  },
  "fad": {
    "10xp": "SWFFG.CharacterCreator.startingBonus.fad.10xp",
    "2k_credits": "SWFFG.CharacterCreator.startingBonus.fad.2k_credits",
    "5xp": "SWFFG.CharacterCreator.startingBonus.fad.5xp",
    "21_plus_morality": "SWFFG.CharacterCreator.startingBonus.fad.plus_21_morality",
    "21_minus_morality": "SWFFG.CharacterCreator.startingBonus.fad.minus_21_morality",
  },
  "eote": {
    "5xp": "SWFFG.CharacterCreator.startingBonus.eote.5xp",
    "10xp": "SWFFG.CharacterCreator.startingBonus.eote.10xp",
    "1k_credits": "SWFFG.CharacterCreator.startingBonus.eote.1k_credits",
    "2k_credits": "SWFFG.CharacterCreator.startingBonus.eote.2k_credits",
  },
}


export const characterCreator = {
  rules: rules,
  backgroundTypes: backgroundTypes,
  obligationTypes: obligationTypes,
  startingBonusesRadio: startingBonusesRadio,
};
