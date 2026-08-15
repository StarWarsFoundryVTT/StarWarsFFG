## Purpose

Defines the supported Foundry VTT runtime contract for installing, starting, and playing the StarWarsFFG system on Version 14 without regressing the retained Version 13 baseline.

## ADDED Requirements

### Requirement: Supported Foundry generations
The system SHALL declare and provide runtime support for the latest stable maintenance releases of Foundry VTT 13 and 14 until a later change explicitly raises the minimum generation.

#### Scenario: Start a Version 14 world
- **WHEN** a world using the system is launched on the latest stable Foundry VTT 14 release with third-party modules disabled
- **THEN** system initialization completes without a fatal error and the world reaches the ready state

#### Scenario: Start a Version 13 world
- **WHEN** a world using the same system release is launched on the latest stable Foundry VTT 13 release with third-party modules disabled
- **THEN** system initialization completes without a fatal error and the world reaches the ready state

#### Scenario: Install from the package manifest
- **WHEN** Foundry evaluates the system manifest on either supported generation
- **THEN** the package is reported as compatible with that generation

### Requirement: Core document workflows
On Foundry VTT 14, the system SHALL preserve creation, rendering, editing, persistence, and deletion of every Actor and Item subtype declared by the package.

#### Scenario: Create and update an Actor
- **WHEN** a user with permission creates any supported Actor subtype, changes a field, closes its sheet, and reopens it
- **THEN** the Actor is created and the changed value is preserved

#### Scenario: Create and update an Item
- **WHEN** a user with permission creates any supported Item subtype, changes a field, closes its sheet, and reopens it
- **THEN** the Item is created and the changed value is preserved

#### Scenario: Manage an embedded Item
- **WHEN** a user adds, edits, equips or learns where applicable, and removes an Item embedded in an Actor
- **THEN** the Actor and Item state and resulting derived statistics remain consistent with the same workflow on Version 13

### Requirement: Dice and chat behavior
The system SHALL render custom FFG dice results and SHALL honor the user-selected Foundry chat message visibility mode on Version 14.

#### Scenario: Public roll
- **WHEN** a user makes an FFG roll using the public message mode
- **THEN** the chat message displays the resolved FFG symbols and permitted roll controls to all connected users

#### Scenario: Restricted roll
- **WHEN** a user makes an FFG roll using GM-only, blind, or self-only visibility
- **THEN** roll details are exposed only to the recipients authorized by that selected mode

#### Scenario: Use a chat-card action
- **WHEN** an authorized user activates a system action on a rendered FFG chat card
- **THEN** the action executes exactly once and uses the data associated with that message

### Requirement: Combat and initiative behavior
The system SHALL preserve its custom initiative, combat tracker, generic-slot, and combatant management behavior on Foundry VTT 14.

#### Scenario: Roll initiative
- **WHEN** combatants roll initiative under any system-supported initiative rule
- **THEN** the resulting order and displayed FFG results follow the configured rule

#### Scenario: Use generic initiative slots
- **WHEN** generic initiative slots are enabled and a combatant acts or is removed
- **THEN** slot assignment and remaining turn order stay internally consistent for all connected users

#### Scenario: Advance combat
- **WHEN** the GM advances turns and rounds through the combat tracker
- **THEN** the tracker updates without a system exception and applicable effect lifecycle behavior is processed once

### Requirement: Import and macro compatibility
Supported importers, drag-and-drop workflows, and generated macros SHALL continue to resolve documents and produce usable system data on Foundry VTT 14.

#### Scenario: Import supported data
- **WHEN** a GM imports a valid supported character or dataset containing Items and modifiers
- **THEN** the created documents can be opened and their statistics, modifiers, and effects match the imported source

#### Scenario: Execute a generated macro
- **WHEN** a user executes a system-generated skill or Item macro whose referenced document still exists
- **THEN** the macro resolves that document and opens or performs the expected roll workflow

### Requirement: Reproducible compatibility validation
The release candidate SHALL be verifiable against isolated Version 13 and Version 14 test worlds using repository-controlled configuration rather than a hard-coded remote server.

#### Scenario: Run the Version 14 smoke suite
- **WHEN** a maintainer supplies the documented local Version 14 test-world configuration and runs the smoke suite
- **THEN** startup, Actor and Item lifecycle, dice, chat visibility, combat, Active Effects, and import coverage produce a repeatable pass or actionable failure

#### Scenario: Audit compatibility diagnostics
- **WHEN** the Version 14 smoke suite runs with compatibility warnings enabled
- **THEN** it reports no unexpected system-originated deprecated API use outside the separately scoped ApplicationV1 and legacy system-data-template migrations
