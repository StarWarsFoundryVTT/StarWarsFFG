# Foundry VTT 14 compatibility

StarWarsFFG supports Foundry VTT 13 and 14 during the runtime compatibility phase. Always back up a world before opening its copy on a newer Foundry generation. A world migrated on Version 14 must be restored from its Version 13 backup before downgrade; do not open the migrated database in an older generation.

Before upgrading, stop Foundry completely and copy the entire world directory from `Data/worlds/<world-id>` to storage outside the active Foundry data directory. Keep that backup unchanged until the migrated world has passed Actor, Item, effect, roll, combat, importer, and macro checks. To roll back, stop Foundry 14, restore the complete backup into a Version 13 data directory, reinstall the Version 13-compatible system build, and start the restored world there. Downgrading the migrated database in place is unsupported.

## Deferred compatibility warnings

The following warnings are intentionally deferred to their dedicated OpenSpec changes:

- ApplicationV1, `FormApplication`, and legacy Actor/Item sheet usage is handled by `migrate-ui-to-application-v2`.
- Legacy `template.json` system data definitions are handled by `adopt-typed-system-data-models`.

No other system-originated compatibility warning is allowlisted. In particular, Version 14 runtime code must not use legacy Active Effect changes or numeric modes, `renderChatMessage`, `core.rollMode`, `ChatMessage#applyRollMode`, or singular combatant-by-token lookup outside the explicit Version 13 compatibility adapters.

## Migration behavior

On first Version 14 launch, the active GM client migrates effects on world Actors and Items, embedded Items, unlinked token Actors, and writable world compendiums. The system logs migrated, skipped, failed, and locked-pack entries. The migration checkpoint advances only when writable content has no failures. Locked and external compendiums are reported and never force-unlocked.

If migration reports a failure:

1. Keep the pre-upgrade backup untouched.
2. Copy the failing document UUID and reason from the browser console.
3. Correct or remove only the malformed effect in another disposable copy.
4. Restart the world; successful documents are skipped and failed documents are retried.

See the local harness instructions in `playwright/README.md` for the two-generation validation matrix, migrated-world comparison, and temporary multi-client checks.
