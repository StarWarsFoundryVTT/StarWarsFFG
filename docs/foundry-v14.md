# Foundry VTT 14 migration

## Target and status

- Branch: `misterWhite-foundry-v14`.
- Starting commit: `a0a0b546e6171551bf37c55e2420eaafc0a04e56`.
- Target runtime: Foundry VTT 14.367 (stable), checked 2026-09-09.
- Existing Windows runtime: Foundry VTT 13.351, serving the live `Star Wars` world on port 30000.
- Current status: **27/27 integration tests pass against the installed development archive**, and **18/18 isolated compatibility tests pass**. The representative v13 backup completed core migration to 14.367 and now opens in the GM client. Acceptance checks on existing documents remain in progress; full compatibility is **not yet verified**.
- Manifest: minimum 13, verified 13, maximum 14. Maximum permits development testing; it is not a verification claim.

## Changes prepared

Chat creation uses `author` and `style`. Chat rendering listens for `renderChatMessageHTML` and adapts its HTMLElement to the existing jQuery handlers. The dice audio call uses the namespaced AudioHelper.

The roll boundary selects the correct core setting and API for v13/v14, accepts older macro roll-mode arguments, and returns plain document data for `create: false`. In v14 `public` is the public mode; the legacy `roll` sentinel uses the saved mode. Initiative hides otherwise-public rolls for hidden combatants. The group manager uses the current private roll option for obligation/duty triggers. The chat dice button now sits beside the v14 message-mode controls.

Active Effect creation uses string change types on v14 and numeric modes on v13. Rank updates retain a change's type, phase and priority. The Actor override forwards the application phase and prepares Force bonuses only during the initial phase, excluding inactive effects. The sheet builds plain display data from v14's system.changes and prepared duration label, avoiding core compatibility setters. The combat tracker reads actor effects rather than removed token fields.

The v14 base Active Effect data model retains FFG's `system.duration` field, so once-per-roll and combat effects survive saving and expire through the existing system handlers.

Item-sheet cleanup traverses item system data, avoiding circular Document references in the v14 sheet context. Item drops retain adjusted item values while copying effects from source data: prepared permanent durations contain Infinity and cannot be persisted.

Item sheets enrich a plain copy of the Item rather than its live data. New species build missing inherent effect changes on their first edit. Equipment effects synchronize after item creation and accessory drops; installed vehicle components remain active without a character equip toggle.

Item preparation is synchronous, as required by Foundry's document lifecycle. The previous asynchronous override allowed sheet snapshots to run before talent-tree visibility and calculated item values were ready.

The public Karlinator fork was examined as a reference. Its changes are not merged: its manifest claim does not establish coverage of dice, message privacy or effects for this newer upstream checkout.

## Validation performed

`npm run compile` succeeds on the starting checkout. Its generated CSS differs from the checked-in file; that unrelated output was not included in this migration.

Initial ESLint baseline: **119 errors and 466 warnings**. The first compatibility pass introduces no additional error messages. Existing errors remain and are not evidence of v14 compatibility.

Current ESLint result: **119 errors and 464 warnings**, with no new error messages compared with that baseline. The final Sass compilation also succeeds in an isolated build directory, without changing the repository's pre-existing generated CSS.

Run the isolated document-boundary tests with:

```bash
npm run test:compat
```

These tests execute the actual system roll and compatibility helpers against stubbed Foundry interfaces. They check mode selection, intended whisper recipients, legacy macro options, deferred message creation, private group rolls and effect change formats. They **do not** establish actual client permissions, rendering, serialization or core data migrations. Those require the runtime checks below.

## Isolated Foundry environment

Use a separate Foundry 14 installation and a separate User Data folder. Do not launch this development system against the live Windows User Data folder. The tests create and delete documents.

The official `FoundryVTT-Node-14.367.zip` was installed and activated. Node 24.15.0 satisfies its declared requirement of `>=24.13.1 <25.0.0`.

Installed WSL locations:

```text
/home/tonio2581/foundry-v14/          Application files
/home/tonio2581/foundry-v14-data/     Disposable development data
```

The test instance uses port 30001, with UPnP disabled. Its `Data/systems/starwarsffg` links to this repository. The created world is:

```text
ID:    starwarsffg-v14-test
Title: Star Wars FFG v14 Test
MJ:    Gamemaster
```

The separate `Player2` account is used for permission checks. There are no add-on modules. Do not open the test Gamemaster account in another browser while running Playwright: Foundry does not permit a second session to select an already-connected user.

To start this installation from an Ubuntu terminal when it is stopped:

```bash
/home/tonio2581/.nvm/versions/node/v24.15.0/bin/node \
  /home/tonio2581/foundry-v14/main.js \
  --dataPath=/home/tonio2581/foundry-v14-data --port=30001 --upnp=false
```

Open `http://localhost:30001` in the Windows browser. Stop a foreground server with Ctrl+C. Keep Node 24 selected when running npm commands; the machine's default Node 20 cannot run this Foundry release.

Copy `.env.example` to `.env` and set the actual test server URL. Browser setup checks the title/version before joining and checks the world ID, system and generation after joining. The title/version check is deliberately before GM login because login can itself trigger system migration.

After preparing the browser runtime and launching the disposable world:

```bash
npm run test:e2e -- --trace on
```

The login locators now support v13's select and v14's user picker. The player test explicitly starts with empty storage state, so it does not reuse the Gamemaster's server session.

The suite contains 16 effect scenarios and 11 runtime compatibility scenarios in `e2e/runtimeCompatibility.spec.js`. Playwright is aligned to 1.62.1; its Chromium 151 satisfies Foundry 14's minimum Chromium 146. The previous pinned test runner downloaded Chromium 141, which is unsupported. Software WebGL is configured for WSL/CI.

The integration scenarios cover all seven narrative dice, standard and mixed pools, automatic symbols and cancellation, serialization, deferred messages, and actual public/GM/blind/self visibility in separate player and GM sessions, including reloads. They also exercise the five actor types, item sheets and talent trees, Force effect phases and persistence, once-per-roll and combat effect expiration, hidden initiative, combat slot claims and turn progression, and destiny rolls and pool synchronization across two clients.

The complete integration suite passed **27/27 in 4.8 minutes** against the installed development archive on 2026-09-09. The trace inspection found no browser console errors. The archive contains 432 distributable files and was extracted into a separate package directory; the test server loaded that directory instead of the checkout during this run. Its SHA-256 is `1b0974f8f7e51262b4eaca29c49eb59e5f73f168fa80abdc63c4b253e1558949`. The development symlink was restored to the checkout afterward.

The browser fixtures now complete the purchase/grant dialog and close the specific software-rendering warning that otherwise covers sheet controls. Stat checks assert saved-looking field values rather than accidentally filling them; accessory tests require equipping a character's item before its bonuses apply. Failures attach test document data to the Playwright trace for diagnosis.

## Representative v13 world copy

An existing Foundry backup dated 2026-06-11 was restored into the isolated v14 data directory. Its metadata identifies core 13.351 and system 2.0.3. The copied world keeps ID `star-wars` for its asset references, with title **Star Wars v13 Migration Test**. The original Windows world and backup were not modified.

On 2026-09-09, Foundry created an additional backup of the isolated copy and completed its core migration. The copied manifest now records 14.367. The server logged 1,457 migrated Actor records (including the adversary compendium), 91 ChatMessages, 5 FogExplorations and 14 Scenes across five migrated databases, without warnings or errors during that migration. Foundry automatically disabled modules and active scenes as part of the generation upgrade.

The user signed in with the GM account and the migrated client initializes, displaying existing actors, scenes and historical chat rolls. The first view showed missing portraits, tokens and scene backgrounds because media outside the world backup had not been copied. The `assets/Star Wars`, `assets/Misc` and `worlds/star-wars/assets` media directories were copied from the Windows installation into the isolated data directory: 903 files (442,367,180 bytes) were added and verified by SHA-256, while 13 existing files were retained. The Windows source files were not modified. A fresh client view now renders the Mos Zandari background correctly.

The world database remains the 2026-06-11 backup; copying current media does not update it to the latest live campaign state. The existing Dodge character sheet opens with its portrait, characteristics, skills, species, career and specializations. Broader existing-document checks and persistence of subsequent edits remain outstanding. Optional modules and importers require separate checks.

## Runtime acceptance checklist

- [x] Server starts as 14.367 and loads this checkout's system.
- [x] A fresh world initializes without blocking console/server errors.
- [x] Character, minion and vehicle creation, editing, item drops and persistence work.
- [x] All seven narrative dice, standard dice, mixed pools, automatic symbols, cancellation and serialization work.
- [x] Public, GM, blind and self rolls have the correct visibility in separate MJ/player sessions, including after reload.
- [x] Initiative for hidden combatants stays private; combat creation, slot claims and turn progression work.
- [x] Destiny point rolls, spending and synchronization work across clients.
- [x] Effects on actors/items apply correctly, preserve phases/priorities, display durations and expire as expected.
- [x] Existing Playwright effect tests pass in the disposable world.
- [x] A representative v13 backup completes core migration and persists the migrated databases; source world remains untouched.
- [x] The migrated world initializes in the GM client and an existing character sheet opens with its data and portrait.
- [ ] Broader existing-document checks and persistence of subsequent edits pass in the migrated world.
- [ ] Importers and supported optional module integrations are checked separately.
- [x] A packaged archive installs and reproduces the verified behavior.

Update `compatibility.verified`, the release version and the fork's download URLs only after runtime acceptance. No release has been published.

## Primary references

- [Foundry 14.367](https://foundryvtt.com/releases/14.367)
- [v14 removals](https://github.com/foundryvtt/foundryvtt/issues/13436)
- [ChatMessage API](https://foundryvtt.com/api/v14/classes/foundry.documents.ChatMessage.html)
- [Roll API](https://foundryvtt.com/api/v14/classes/foundry.dice.Roll.html)
- [Active Effect change types](https://foundryvtt.com/api/v14/variables/CONST.ACTIVE_EFFECT_CHANGE_TYPES.html)
- [Actor effect phases](https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html#applyActiveEffects)
