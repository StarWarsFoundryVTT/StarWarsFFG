## 1. Reproducible Compatibility Baseline

- [x] 1.1 Restore deterministic package installation and linting from the lockfile, align declared tool versions, and document the supported Node.js command set.
- [x] 1.2 Replace the hard-coded Playwright server and credentials with environment-driven local Foundry configuration and actionable setup validation.
- [x] 1.3 Create isolated clean Version 13 and Version 14 smoke worlds with third-party modules disabled and document how to select the installed Foundry build.
- [x] 1.4 Capture a backed-up Version 13 migration fixture containing representative Actor and Item subtypes, embedded Items, direct and transferred effects, an unlinked token Actor, macros, combat, and a writable compendium.
- [x] 1.5 Add baseline checks that record pre-migration prepared statistics and verify clean startup plus core Actor and Item lifecycle on the currently supported Version 13 release.

## 2. Runtime Compatibility Boundaries

- [x] 2.1 Implement a generation-aware Active Effect adapter with a normalized string-type representation and unit tests for Version 13 and Version 14 read, create, and update payloads.
- [x] 2.2 Implement a generation-aware chat visibility adapter covering public, GM-only, blind, and self-only messages on both supported generations.
- [x] 2.3 Inventory all system-originated Version 14 compatibility warnings and define the narrow temporary allowlist for ApplicationV1 and `template.json` only.

## 3. Active Effects V2 Runtime Migration

- [x] 3.1 Replace direct Active Effect change reads and in-place mutations in Actor preparation and effect display helpers with the normalized adapter.
- [x] 3.2 Convert Item creation, inherent-effect synchronization, and modifier helper payloads to Version 14 system changes and string change types through the adapter.
- [x] 3.3 Convert character creation, tours, sheets, editors, settings/status setup, and all other effect-producing UI workflows to the shared effect contract.
- [x] 3.4 Convert OggDude/SWA/data importer and existing system migration effect payloads to the shared effect contract.
- [x] 3.5 Replace legacy duration, start, origin, change-mode, and effect update access with supported Version 14 structures while retaining Version 13 translations at the boundary.
- [x] 3.6 Add focused tests proving equivalent direct, transferred, disabled, status, skill, force-rating, duration, and inherent Item effects across Versions 13 and 14.

## 4. Persisted Effect Migration

- [x] 4.1 Implement source normalization and semantic diffing for legacy effects, including numeric-mode to string-type and duration/start conversions.
- [x] 4.2 Implement authoritative-GM traversal and updates for world Actors, standalone Items, embedded Items, and unlinked token Actor data.
- [x] 4.3 Implement writable Actor and Item compendium traversal, including embedded Items, and report non-writable or external content without force-writing it.
- [x] 4.4 Add per-document success, skip, and failure reporting and advance the migration checkpoint only after every required writable document succeeds.
- [x] 4.5 Add malformed-data recovery and repeat-run tests proving failed source remains recoverable and successful migrations are idempotent.
- [x] 4.6 Run the copied Version 13 fixture through Version 14 migration and compare normalized effects plus all recorded prepared mechanical outcomes.

## 5. Chat, Dice, Combat, and Public APIs

- [x] 5.1 Replace legacy chat render hooks with the native-element hook and convert dice images, chat-card actions, collapse controls, and destiny controls to single-binding native DOM handlers.
- [x] 5.2 Migrate custom roll message creation and combat/group roll flows from legacy roll modes and apply methods to the shared current message-mode contract.
- [x] 5.3 Replace deprecated combatant lookup helpers and any other confirmed Version 14 deprecations in combat and initiative paths with supported public APIs.
- [x] 5.4 Namespace supported Foundry APIs in every touched runtime file and remove obsolete compatibility-only data paths encountered in scope.
- [x] 5.5 Add browser coverage for custom dice rendering, each message visibility mode, one-action-per-click behavior, initiative rules, generic slots, and turn advancement.
- [x] 5.6 Add smoke coverage for supported importers, drag/drop, and generated skill and Item macros on Version 14.

## 6. Release Gates

- [x] 6.1 Run unit tests, lint, Sass compilation, the Version 13 regression suite, and the Version 14 clean-world and migrated-world suites.
- [x] 6.2 Perform documented multi-client GM/player checks for restricted rolls, sockets, destiny controls, combat synchronization, and canvas-linked behavior.
- [x] 6.3 Run Version 14 with compatibility diagnostics enabled and resolve every unexpected system-originated warning outside the two deferred proposals.
- [x] 6.4 Update `system.json` compatibility metadata, the changelog, migration/backup guidance, and contributor test instructions after all runtime and migration gates pass.
- [x] 6.5 Verify the release archive installs into clean Version 13 and Version 14 data directories and reaches the ready state in both.
