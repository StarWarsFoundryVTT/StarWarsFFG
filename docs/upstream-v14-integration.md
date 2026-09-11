# Upstream v14 improvements integrated into the fork

This follow-up adapts selected changes from [salohcin714's PR #2280](https://github.com/StarWarsFoundryVTT/StarWarsFFG/pull/2280), reviewed at commit `a3d0e66eb816c20e6edea8504910129b0baa249b`. It builds on this fork's `786cdb6` compatibility work. The compatibility adapters, migration traversal, syntax checker and several test scenarios originate from that contribution.

## Effect data boundaries

`modules/compatibility/active-effects.js` normalizes legacy numeric modes, numeric `type` snapshots and v14 string types. `ActiveEffectFFG.createDocuments()` and `updateDocuments()` apply normalization to single and embedded batch operations. Updates accept top-level `changes`, nested `system.changes` and flattened `system.changes`, retaining unrelated fields.

`getActiveEffectChanges()` returns detached source definitions for persistent edits. It strips the prepared effect back-reference. `getPreparedActiveEffectChanges()` exposes the prepared changes for Actor calculation and source display. The Force calculations retain the active-effect filter and initial-phase guard; they never mutate stored source definitions.

Inherent effects, importer modifier updates, rank synchronization and equipment encumbrance now use these boundaries. The existing fixes for new species, zero-valued attributes, equipped/installed components, synchronous Item preparation, source-based Item drops, effect duration labels and `system.duration` remain in place.

## Persisted migration

`modules/migration/active-effects-v14.js` runs from the active GM on v14 and scans world Actors, standalone Items, embedded Items, unlinked token Actors and writable world Actor/Item compendiums. Locked and external compendiums are reported and skipped.

The migration converts remaining legacy effect definitions and duration/start fields. It also detects duration-only changes, preserves zero durations, expiry and explicit start metadata, and ignores non-enumerable compatibility accessors when checking for repeat work. Malformed change arrays and failed document writes are reported instead of silently replaced.

The `activeEffectMigrationVersion` world setting advances only after the scan completes without failures. On failure, the next launch retries; successfully normalized documents are skipped. The migration does not replace Foundry's core world migration or automatically unlock compendiums.

## Macros and UI

Generated weapon macros resolve the actual parent Actor and Item IDs. Standalone weapons open their document sheet. Skill macros read `system` data and await asynchronous sheet preparation; existing matching macros can be assigned to another hotbar slot. Identifiers and skill names are encoded as JavaScript string literals.

The legacy adversary sheet uses the namespaced `mergeObject` API. Status Icon Counters updates use detached effect definitions, retain zero counter values, and only run on the client initiating a counter edit. Updates without a counter change do not trigger another write.

The existing chat normalization is retained, including the legacy `roll` sentinel, private hidden initiatives, plain data for deferred messages, and working jQuery tooltip handlers.

## Verification

The follow-up adds unit tests for source/prepared isolation, all effect update shapes, custom and numeric modes, migration traversal and retries, malformed data, non-writable packs, duration-only changes, and generated macro execution.

Browser coverage includes all Actor/Item subtypes, every registered system sheet, edits through sheet forms, native/legacy embedded effect batches, real weapon and skill macro rolls, and opening and closing both importer windows. Tests explicitly identify the disposable world and run serially, using separate v13/v14 session files.

Commands:

```bash
npm test
npm run test:e2e
```

Configure `.env` using `.env.example` and run browser tests against a disposable world. These tests create and delete documents. Foundry 13 and 14 were run against separate test data folders; the existing campaign installations were not used for the test suite.

Validation on 2026-09-09:

- Module syntax: 93 JavaScript files checked successfully.
- Isolated compatibility tests: 40/40 passed.
- Foundry 14.367: 33/33 browser tests passed in 6.3 minutes against the installed development archive.
- Foundry 13.351: 5/5 targeted browser tests passed, covering macros, importer window initialization, document lifecycles, registered sheets and form persistence. This is narrower coverage than the full v14 suite.
- ESLint: 110 errors and 464 warnings, compared with 119 errors and 464 warnings before this follow-up. No new error messages or changes to lint severity rules.

The tested development archive contains 435 files. SHA-256: `7c4792738557a216920221fe08d2d7832edbf1eb71f122b515b7019314f7dc44`.

The system manifest retains `minimum: 13`, `verified: 13`, `maximum: 14`. Full dataset imports, optional-module integration and broader checks of existing campaign documents remain separate acceptance work. Opening importer windows does not establish that a complete import succeeds. The upstream lint-severity downgrade, release-version bump and blanket v14 verification declaration were not adopted.
