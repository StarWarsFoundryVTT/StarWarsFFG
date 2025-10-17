# dice

![npm version](https://img.shields.io/npm/v/@swrpg-online/dice)
![build](https://github.com/swrpg-online/dice/actions/workflows/release.yml/badge.svg)
[![codecov](https://codecov.io/gh/swrpg-online/dice/graph/badge.svg?token=BQIFNBWKI8)](https://codecov.io/gh/swrpg-online/dice)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

A TypeScript library that creates dice rolls using the [narrative dice system](https://star-wars-rpg-ffg.fandom.com/wiki/Narrative_Dice) for the Star Wars Roleplaying Game by [Fantasy Flight Games](https://www.fantasyflightgames.com/en/starwarsrpg/) and [Edge Studio](https://www.edge-studio.net/categories-games/starwarsrpg/).

## Features

- Complete narrative dice system implementation
- Detailed roll breakdown for each die
- Action hints to suggest possible uses for advantages, triumphs, etc.
- Roll results include:
  - Successes / Failures
  - Advantages / Threats
  - Triumphs / Despairs
  - Light / Dark Side Points (Force dice)
- **Dice Pool Modifiers** (New!):
  - Automatic symbols from talents, attachments, and equipment
  - Dice upgrades (ability→proficiency, difficulty→challenge)
  - Dice downgrades (proficiency→ability, challenge→difficulty)
- Comprehensive Test Coverage
- The safety of TypeScript
- CLI Support

## Installation

### As a CLI Tool

To use the dice roller from the command line:

```bash
npm i -g @swrpg-online/dice
```

### As a project dependency

```bash
npm i @swrpg-online/dice
```

## CLI Usage

```
swrpg-dice <dice-notation> [options]
```

Examples:

```bash
# Basic roll with modifiers
swrpg-dice 2y 1g 1p 1b 1sb +2s +1a --hints

# With upgrades and downgrades
swrpg-dice 3g 2p +2ua +1ud  # Upgrades 2 ability and 1 difficulty
swrpg-dice 2y 1r +1dp +1dc  # Downgrades 1 proficiency and 1 challenge
```

Output:

```
3 Success(es), 5 Advantage(s)

Possible actions:
 • 1 Advantage or 1 Triumph - Recover one strain (may be applied more than once).
 • 1 Advantage or 1 Triumph - Add a boost die to the next allied active character's check.
 • 1 Advantage or 1 Triumph - Notice a single important point in the ongoing conflict, such as the location of a blast door's control panel or
 ...
```

Dice Options:

- y/pro = Yellow / Proficiency
- g/a = Green / Ability
- b/boo = Blue / Boost
- r/c = Red / Challenge
- p/diff = Purple / Difficulty
- blk/k/sb/s = Black / Setback
- w/f = White / Force

Modifier Options (use + or - prefix):

**Automatic Symbols:**

- `+Ns` - Add N automatic successes
- `+Nf` - Add N automatic failures
- `+Na` - Add N automatic advantages
- `+Nt` - Add N automatic threats
- `+Ntr` - Add N automatic triumphs
- `+Nd` - Add N automatic despairs

**Dice Upgrades/Downgrades:**

- `+Nua` - Upgrade N ability dice to proficiency
- `+Nud` - Upgrade N difficulty dice to challenge
- `+Ndp` - Downgrade N proficiency dice to ability
- `+Ndc` - Downgrade N challenge dice to difficulty

## Programmatic Usage

```typescript
import { roll, DicePool, createCombatCheck, applyTalentModifiers } from '@swrpg-online/dice';

// Basic usage
const pool: DicePool = {
    abilityDice: 2,
    proficiencyDice: 1,
    difficultyDice: 1,
    challengeDice: 1
};

const result = roll(pool);

console.log(result.results);
console.log(result.summary);

// With modifiers (talents, attachments, etc.)
const enhancedPool: DicePool = {
    abilityDice: 3,
    difficultyDice: 2,
    automaticSuccesses: 1,      // From a talent like Sharpshooter
    automaticAdvantages: 1,      // From Superior weapon quality
    upgradeAbility: 1,           // From Aim maneuver
    upgradeDifficulty: 2,        // From Adversary 2 talent
};

const enhancedResult = roll(enhancedPool);

// Using helper functions
const basePool = createCombatCheck(3, 1, 1); // 3 ability, 1 proficiency, 1 boost
const talentBonus = {
    automaticSuccesses: 1,
    upgradeAbility: 1
};
const modifiedPool = applyTalentModifiers(basePool, talentBonus);
const finalResult = roll(modifiedPool);

=> {
  "results": [
    {
      "type": "ability",
      "roll": 5,
      "result": {
        "successes": 0,
        "failures": 0,
        "advantages": 1,
        "threats": 0,
        "triumphs": 0,
        "despair": 0
      }
    },
    {
      "type": "proficiency",
      "roll": 10,
      "result": {
        "successes": 0,
        "failures": 0,
        "advantages": 2,
        "threats": 0,
        "triumphs": 0,
        "despair": 0
      }
    },
    ...
  ],
  "summary": {
    "successes": 0,
    "failures": 0,
    "advantages": 3,
    "threats": 2,
    "triumphs": 0,
    "despair": 0
  }
}
```

# License

This project is licensed under the MIT License.

# Contribution

This is a new library for a game with not a lot of open source tooling available - feedback and pull requests welcome!
