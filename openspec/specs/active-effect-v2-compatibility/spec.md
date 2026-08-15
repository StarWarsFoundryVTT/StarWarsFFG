## Purpose

Defines lossless Active Effects V2 creation, evaluation, and migration so existing characters, Items, imports, and compendiums retain identical mechanical outcomes on Foundry VTT 14.

## Requirements

### Requirement: Version-native Active Effect data
On Foundry VTT 14, every Active Effect created or updated by the system SHALL use the Version 14 effect system data, string change types, typed values, and current duration and start structures without relying on legacy compatibility properties.

#### Scenario: Create a modifier effect on Version 14
- **WHEN** the system creates an Active Effect for an Item modifier or status on Version 14
- **THEN** each persisted change is stored in the effect's system data with a supported string change type and a value accepted by the target field

#### Scenario: Update an existing modifier
- **WHEN** an Item or Actor workflow changes the value of an existing effect modifier
- **THEN** the system submits a valid Version 14 update and the prepared Actor reflects the new value exactly once

#### Scenario: Create an effect on retained Version 13 support
- **WHEN** the same system workflow creates an effect while running on Version 13
- **THEN** the persisted payload uses the Version 13-compatible representation and produces the equivalent modifier

### Requirement: Complete legacy effect migration
The system SHALL migrate legacy Active Effect structures associated with world Actors, world Items, embedded Items, unlinked token Actors, and writable Actor or Item compendiums before marking the Version 14 system migration complete.

#### Scenario: Migrate world documents
- **WHEN** a GM first opens a copied Version 13 world on Version 14
- **THEN** legacy effects on world Actors, standalone Items, embedded Items, and unlinked token Actors are persisted in the Version 14 structure

#### Scenario: Migrate compendium documents
- **WHEN** the world contains a writable Actor or Item compendium with legacy effects
- **THEN** its documents and embedded Items are migrated and remain usable after the pack is reopened

#### Scenario: Encounter a non-writable pack
- **WHEN** a legacy effect is found in a compendium that cannot be updated
- **THEN** the migration identifies the pack and affected document in its report and does not claim complete migration of that content

### Requirement: Mechanical equivalence after migration
Migrating an Active Effect SHALL preserve its enabled state, statuses, origin information where valid, transfer behavior, duration intent, change ordering, and resulting game-mechanical adjustments.

#### Scenario: Compare prepared Actor values
- **WHEN** an Actor with direct and Item-transferred effects is measured before migration on Version 13 and after migration on Version 14
- **THEN** wounds, strain, soak, defence, encumbrance, characteristics, skills, dice modifiers, and other affected values are mechanically equivalent

#### Scenario: Preserve an inactive effect
- **WHEN** a disabled or suspended legacy effect is migrated
- **THEN** it remains inactive until the same gameplay condition would activate it

#### Scenario: Preserve a finite duration
- **WHEN** a legacy effect has a seconds, rounds, turns, or current-combat duration
- **THEN** the migrated effect represents the same duration and expiration intent using Version 14 duration and start data

### Requirement: Idempotent and failure-safe migration
The Active Effect migration SHALL be idempotent and SHALL not silently discard or partially replace effect data that it cannot safely transform.

#### Scenario: Run migration again
- **WHEN** the migration is run against content already migrated successfully
- **THEN** it makes no semantic changes and does not duplicate changes or effects

#### Scenario: Encounter malformed effect data
- **WHEN** an effect contains a change, duration, or origin value that cannot be transformed safely
- **THEN** the original persisted data remains recoverable, the affected document is identified with a reason, and the migration completion marker is not advanced past the failed migration

#### Scenario: Resume after correcting a failure
- **WHEN** the malformed content is corrected and the migration is run again
- **THEN** previously successful documents are left unchanged and the corrected document is migrated

### Requirement: Effect-producing workflows use one compatibility contract
All system workflows that create or manipulate effects SHALL produce equivalent results, including sheets, character creation, tours, importers, migrations, Item synchronization, and modifier editors.

#### Scenario: Create equivalent effects from different workflows
- **WHEN** the same modifier is added through a sheet, an importer, and character creation
- **THEN** each resulting effect has an equivalent target, change type, value, enabled state, and prepared-data result

#### Scenario: Synchronize an inherent Item effect
- **WHEN** a field backed by an inherent Item effect changes
- **THEN** the corresponding effect change is updated without mutating unrelated changes or creating a duplicate inherent effect
