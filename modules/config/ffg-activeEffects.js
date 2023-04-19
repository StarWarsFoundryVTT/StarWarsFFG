export const activeEffectChanges = {
  "system.stats.wounds.value": "Wound",
  "system.stats.strain.value": "Strain",
  "career_skill.charm": "Charm (Career Skill)",
  "skill_rank.charm": "Charm (+1 rank)"
};

// TODO: remove
export const modActiveEffects = {
  "mod.boost": "+1 Boost Die",
  "mod.light": "-1 encumbrance"
}

// TODO: remove
export const activeEffectMap = {
  "mod.boost": "system.stats.wounds.value",
  "mod.light": "system.stats.strain.value"
}

export const testMap = {
  'Wounds': 'system.attributes.Wounds.value',
  'Strain': 'system.attributes.Strain.value',
  'Soak': 'system.attributes.Soak.value', // may also be adjusted
  'Defence-Melee': 'system.attributes.Defence-Melee.value',
  'Defence-Ranged': 'system.attributes.Defence-Ranged.value',
  'Encumbrance': 'system.attributes.Encumbrance.value',
  'ForcePool': 'system.attributes.ForcePool.value',
  'Brawn': 'system.attributes.Brawn.value',
  'Agility': 'system.attributes.Agility.value',
  'Intellect': 'system.attributes.Intellect.value',
  'Cunning': 'system.attributes.Cunning.value',
  'Willpower': 'system.attributes.Willpower.value',
  'Presence': 'system.attributes.Presence.value'
}

export const testSkillModMap = {
  'Career Skill': 'careerskill',
  'Force Boost': 'force', // not working
  'Skill Add Advantage': 'advantage',
  'Skill Add Dark': 'dark',
  'Skill Add Despair': 'despair',
  'Skill Add Failure': 'failure',
  'Skill Add Light': 'light',
  'Skill Add Success': 'success',
  'Skill Add Threat': 'threat',
  'Skill Add Triumph': 'triumph',
  'Skill Add Upgrade': 'upgrades', // not working
  'Skill Boost': 'boost', // not working
  'Skill Rank': 'rank',
  'Skill Remove Setback': 'remsetback',
  'Skill Setback': 'setback', // not working
}
