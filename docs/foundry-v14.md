# Foundry VTT 14 migration

## Target and status

- Branch: `misterWhite-foundry-v14`.
- Starting commit: `a0a0b546e6171551bf37c55e2420eaafc0a04e56`.
- Target runtime: Foundry VTT 14.367 (stable), checked 2026-09-08.
- Existing Windows runtime: Foundry VTT 13.351, serving the live `Star Wars` world on port 30000.
- Current status: initial source adaptations and isolated tests only. **Not yet validated in Foundry 14.**
- Manifest: minimum 13, verified 13, maximum 14. Maximum permits development testing; it is not a verification claim.

## Changes prepared

Chat creation uses `author` and `style`. Chat rendering listens for `renderChatMessageHTML` and adapts its HTMLElement to the existing jQuery handlers. The dice audio call uses the namespaced AudioHelper.

The roll boundary selects the correct core setting and API for v13/v14, accepts older macro roll-mode arguments, and returns plain document data for `create: false`. Initiative hides otherwise-public rolls for hidden combatants. The group manager uses the current private roll option for obligation/duty triggers.

Active Effect creation uses string change types on v14 and numeric modes on v13. Rank updates retain a change's type, phase and priority. The Actor override forwards the application phase. The sheet reads duration labels from v14's prepared effect, and the combat tracker reads actor effects rather than removed token fields.

The public Karlinator fork was examined as a reference. Its changes are not merged: its manifest claim does not establish coverage of dice, message privacy or effects for this newer upstream checkout.

## Validation performed

`npm run compile` succeeds on the starting checkout. Its generated CSS differs from the checked-in file; that unrelated output was not included in this migration.

Initial ESLint baseline: **119 errors and 466 warnings**. The first compatibility pass introduces no additional error messages. Existing errors remain and are not evidence of v14 compatibility.

Run the isolated document-boundary tests with:

```bash
npm run test:compat
```

These tests execute the actual system roll and compatibility helpers against stubbed Foundry interfaces. They check mode selection, intended whisper recipients, legacy macro options, deferred message creation, private group rolls and effect change formats. They **do not** establish actual client permissions, rendering, serialization or core data migrations. Those require the runtime checks below.

## Isolated Foundry environment

Use a separate Foundry 14 installation and a separate User Data folder. Do not launch this development system against the live Windows User Data folder. The tests create and delete documents.

The official Node.js distribution ZIP is required. A Node 24.15.0 runtime is already present in WSL; check the downloaded Foundry package's engine requirements before selecting it. Authentication is required on the vendor website to download the archive. Activation/EULA steps, if prompted, must be completed before browser testing.

Proposed WSL locations, to create once the archive is available:

```text
/home/tonio2581/foundry-v14/          Application files
/home/tonio2581/foundry-v14-data/     Disposable development data
```

Use port 30001 if available. Link `Data/systems/starwarsffg` in the development data folder to the repository. Create a world with:

```text
ID:    starwarsffg-v14-test
Title: Star Wars FFG v14 Test
MJ:    Gamemaster
```

Create a separate player account for permission checks. Begin with no add-on modules.

Copy `.env.example` to `.env` and set the actual test server URL. Browser setup checks the title/version before joining and checks the world ID, system and generation after joining. The title/version check is deliberately before GM login because login can itself trigger system migration.

After preparing the browser runtime and launching the disposable world:

```bash
npm run test:e2e -- --trace on
```

The existing browser tests and login locators were built for v13. The world checks are prepared, but v14 interface adaptations and execution remain outstanding.

Test discovery succeeds: 16 existing Chromium scenarios are listed. `test:e2e` invokes the CLI bundled with `@playwright/test` so that the runner and fixtures share a version; the original dependency tree also contains a different standalone Playwright version. Discovery does not execute the scenarios.

## Runtime acceptance checklist

- [ ] Server starts as 14.367 and loads this checkout's system.
- [ ] A fresh world initializes without blocking console/server errors.
- [ ] Character, minion and vehicle creation, editing, item drops and persistence work.
- [ ] All seven narrative dice, standard dice, mixed pools, automatic symbols, cancellation and serialization work.
- [ ] Public, GM, blind and self rolls have the correct visibility in separate MJ/player sessions, including after reload.
- [ ] Initiative for hidden combatants stays private; combat creation, slot claims and turn progression work.
- [ ] Destiny point rolls, spending and synchronization work across clients.
- [ ] Effects on actors/items apply correctly, preserve phases/priorities, display durations and expire as expected.
- [ ] Existing Playwright effect tests pass in the disposable world.
- [ ] A copy of a representative v13 world migrates and persists correctly; source world remains untouched.
- [ ] Importers and supported optional module integrations are checked separately.
- [ ] A packaged archive installs and reproduces the verified behavior.

Update `compatibility.verified`, the release version and the fork's download URLs only after runtime acceptance. No release has been published.

## Primary references

- [Foundry 14.367](https://foundryvtt.com/releases/14.367)
- [v14 removals](https://github.com/foundryvtt/foundryvtt/issues/13436)
- [ChatMessage API](https://foundryvtt.com/api/v14/classes/foundry.documents.ChatMessage.html)
- [Roll API](https://foundryvtt.com/api/v14/classes/foundry.dice.Roll.html)
- [Active Effect change types](https://foundryvtt.com/api/v14/variables/CONST.ACTIVE_EFFECT_CHANGE_TYPES.html)
- [Actor effect phases](https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html#applyActiveEffects)
