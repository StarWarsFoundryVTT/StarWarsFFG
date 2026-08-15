## Context

See `proposal.md` for motivation. The codebase currently targets Foundry VTT 13 and mixes modern `foundry.*` APIs with compatibility globals, legacy chat APIs, and Version 13 Active Effect structures. Foundry VTT 14 provides temporary shims for many of these calls, but Active Effects V2 changes both storage and behavior. Full ApplicationV2 conversion and replacement of `template.json` are intentionally handled by later changes.

The upgrade must protect existing world data, preserve a shared Version 13/14 package where practical, and be testable without the hard-coded remote server currently used by Playwright setup.

## Goals / Non-Goals

**Goals:**

- Establish a reproducible Version 13 and Version 14 runtime matrix.
- Remove reliance on Version 14 shims in the Active Effect, chat, message-visibility, combat, and touched namespace paths.
- Persist legacy effect migrations safely across every storage location used by the system.
- Preserve gameplay results before and after a world upgrade.

**Non-Goals:**

- Converting ApplicationV1 sheets and forms to ApplicationV2.
- Replacing `template.json` with typed system data models.
- Adopting Scene Levels, Region templates, or other unrelated Version 14 features.
- Reformatting or namespace-converting unaffected files solely for consistency.

## Decisions

### Use a centralized generation-aware compatibility boundary

Introduce small system-owned adapters for effect data and chat message visibility. They will branch on the Foundry generation at the boundary and expose one system-level representation to callers.

For effects, the internal representation uses string change types and typed values. The adapter reads and writes `system.changes` on Version 14 and translates to the legacy top-level `changes` plus numeric modes on Version 13. New Version 14 writes will not include both representations. All current direct reads, in-place mutations, creation payloads, and update payloads move behind this boundary.

For chat visibility, the internal representation uses the current public message modes. The boundary maps retained Version 13 values only when required by that runtime. This avoids scattering version checks across rolls, combat, the group manager, and chat cards.

Alternative considered: rely entirely on Foundry compatibility shims. This is rejected because it leaves persisted data and system behavior dependent on APIs scheduled for removal and makes migration completeness impossible to verify.

### Treat Active Effects as a versioned data migration

Add a new system migration checkpoint after the existing migrations. On Version 14, an authoritative GM client traverses:

1. world Actors and their effects and embedded Items;
2. standalone world Items and their effects;
3. synthetic Actors represented by unlinked scene tokens and their embedded Items;
4. writable Actor and Item compendium documents, including embedded Items.

Each effect is converted from a cloned source object, validated by constructing or updating through Foundry's document APIs, and persisted only when its normalized Version 14 source differs. Numeric modes map to the corresponding string type; legacy duration and start fields map to the Version 14 structures; valid origin and other effect metadata are retained. The migration records successes, skips, and failures and advances its checkpoint only after all required writable content succeeds.

Alternative considered: depend on Foundry's in-memory `migrateData` shim and allow normal document updates to persist it eventually. This is rejected because content that is never opened may remain legacy, compendiums would be missed, and there would be no auditable completion point.

### Compare semantic results, not serialized equality

Migration fixtures will record both source snapshots and selected prepared Actor outcomes. Version 14 legitimately changes serialized effect paths, type names, and value types, so byte-for-byte equality is not useful. Tests compare identifiers and unaffected metadata exactly, compare normalized effects structurally, and compare derived mechanical results using representative direct, transferred, disabled, status, and duration effects.

Alternative considered: snapshot only migrated JSON. This is insufficient because structurally valid effects can still be applied twice or in a different order.

### Move chat hooks to native DOM once

Register `renderChatMessageHTML` and make each callback accept `HTMLElement`. Convert chat-card behavior to native queries, delegated listeners, and explicit listener ownership. The old `renderChatMessage` hook will not be registered alongside the new hook, preventing duplicate actions. DOM helpers will be shared between the main chat behavior and destiny controls.

Alternative considered: wrap the native element in jQuery. This would retain the deprecated dependency and would not prove compatibility with the current hook contract.

### Keep the namespace audit scoped to touched runtime paths

Changed files will use supported `foundry.*` namespace exports and public methods. A static audit will inventory remaining compatibility globals, but unrelated ApplicationV1 and data-template references stay allowlisted for their dedicated proposals.

Alternative considered: perform a repository-wide mechanical namespace rewrite. This increases review size and regression risk without being required for the Phase 1 runtime goal.

### Make the browser harness environment-driven

Replace the hard-coded Playwright target and credentials with documented environment inputs and a local isolated test-world setup. Maintain fixture worlds representing a clean Version 14 world and a copied Version 13 world with representative Actors, Items, effects, macros, combat, and compendium content. The same smoke contract runs on the latest stable maintenance build available for each supported generation.

Automated coverage supplements a manual Foundry integration checklist for importers, canvas-linked combat behavior, and multi-client visibility.

## Risks / Trade-offs

- [A core migration and the system migration both transform an effect] → Normalize cloned current source, detect already-modern data, and verify idempotency before persisting.
- [A failed document leaves a partially upgraded world] → Update documents independently, retain an audit report, do not advance the migration checkpoint on any required failure, and require a backup before upgrade.
- [Version 13 and Version 14 branches drift] → Keep branching inside small adapters and run the same behavioral fixtures on both generations.
- [Typed Version 14 change values alter custom modifier semantics] → Define explicit conversions per change type and target, then compare prepared Actor values rather than assuming string coercion.
- [Locked or third-party compendiums cannot be migrated] → Never force-write them; report their package and document identifiers and distinguish required system/world content from external content.
- [Native chat event conversion executes an action multiple times after rerender] → Use idempotent listener binding or event delegation and assert one invocation per click.
- [Known deferred deprecations hide new warnings] → Keep a narrow allowlist for ApplicationV1 and `template.json`; fail the compatibility audit on other system-originated warnings.

## Migration Plan

1. Pin and document the supported Version 13 and latest Version 14 test builds; make the local harness reproducible.
2. Add normalized effect and message-mode adapters with unit fixtures for both generations.
3. Convert effect-producing and effect-consuming runtime paths, then chat, roll, combat, and touched namespace paths.
4. Build a Version 13 migration fixture containing all relevant effect locations and record its pre-upgrade mechanical outcomes.
5. Back up and clone the fixture, open the clone on Version 14, run the migration, and compare documents and prepared outcomes.
6. Run the Version 14 clean-world suite, the Version 13 regression suite, multi-client visibility checks, lint, and compatibility diagnostics.
7. Update compatibility metadata and release notes only after the migration and runtime gates pass.

Rollback requires stopping the Version 14 world, reinstalling the prior system/Foundry generation, and restoring the pre-upgrade world backup. Downgrading a migrated live world in place is not supported.
