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

Example:

```
swrpg-dice 2y 1g 1p 1b 1sb --hints
```

Output:

```
1 Success(es), 4 Advantage(s), 1 Threat(s)

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

## Programmatic Usage

```typescript
import { roll, DicePool } from '@swrpg-online/dice';

const pool: DicePool = {
    abilityDice: 2,
    proficiencyDice: 1,
    difficultyDice: 1,
    challengeDice: 1
};

const result = roll(pool);

console.log(result.results);
console.log(result.summary);

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
