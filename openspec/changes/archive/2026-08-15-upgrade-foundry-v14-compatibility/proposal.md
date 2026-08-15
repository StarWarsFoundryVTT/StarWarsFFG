## Why

The system is declared compatible only with Foundry VTT 13 and still depends on compatibility shims for APIs that changed in Version 14, most critically Active Effects and chat messages. Updating now restores supported operation on the current Foundry generation while creating a reproducible baseline for later UI and data-model modernization.

## What Changes

- Support the latest stable Foundry VTT 14 release and retain Foundry VTT 13 compatibility where the public APIs allow a shared implementation.
- Migrate Active Effect creation, reads, updates, durations, and change types to the Version 14 Active Effects V2 schema.
- Add an idempotent migration for legacy Active Effects stored on world actors, world items, embedded items, unlinked token actors, and system compendiums without changing their mechanical results.
- Move chat rendering and message visibility behavior to the Version 14 native-DOM hooks and message-mode APIs.
- Replace deprecated combat helpers and touched global compatibility aliases with supported public APIs.
- Update the system manifest and establish a local Version 14 validation path covering startup, documents, rolls, combat, effects, importers, and migration.
- Keep full ApplicationV2 conversion and typed Actor/Item system data models outside this change.

## Capabilities

### New Capabilities

- `foundry-v14-runtime`: Defines supported startup and gameplay behavior on Foundry VTT 14, including chat, dice, combat, documents, and package compatibility.
- `active-effect-v2-compatibility`: Defines lossless Active Effects V2 behavior and migration for existing world and compendium content.

### Modified Capabilities

None.

## Impact

This change affects the package manifest, system initialization, Active Effect document handling, actor preparation, item modifier helpers, import and migration paths, chat hooks, custom roll messaging, combat utilities, test configuration, and release documentation. Existing worlds must be backed up before first launch on Version 14 and migration must be verified against representative Version 13 data. This change is a prerequisite for `migrate-ui-to-application-v2` and `adopt-typed-system-data-models`.
