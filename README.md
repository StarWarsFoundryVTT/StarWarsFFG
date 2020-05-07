( PLEASE NOTE: This is a custom fork based on [Jaxxa's implementation](https://github.com/jaxxa/StarWarsFFG/tree/master). )

# StarWarsFFG

This is an implementation of the [Fantasy Flight Games Star Wars](https://www.fantasyflightgames.com/en/starwarsrpg/) roleplaying system by in [Foundry Virtual Tabletop](https://foundryvtt.com/).

# Requirements

This Requires the "Special Dice Roller" Module to Roll the dice and calculate the results.
This is most easily available from the in-game Module browser. After installing it you will need to activate it on your world.
[foundry-vtt-community](https://foundry-vtt-community.github.io/wiki/Community-Modules/#special-dice-roller) or [GitHub](https://github.com/BernhardPosselt/foundryvtt-special-dice-roller)

# Installing

1. Open Foundry VTT
2. Go to the "Game Systems" Tab
3. Click the "Install System" button
4. Copy the Following link into the "Manifest URL" section:
https://raw.githubusercontent.com/jaxxa/StarWarsFFG/master/system.json
5. Click Install, after a few seconds the system should be installed.

# Changelog

* 06/05/2020 - Esrin - Removed old SimpleWorldBuilding dependencies and fixed breakages where necessary.
* 06/05/2020 - Esrin - Renamed core files from Simple World Building to swffg naming scheme for consistency.
* 06/05/2020 - Esrin - Updated to TabsV2 class in actor-sheet-ffg.js to avoid deprecation of Tabs class in future FoundryVTT versions.
* 06/05/2020 - Esrin - Added abbreviations (abrev) to characteristics, refactored skill display on ffg-actor-sheet.html to allow for linked characteristic abbreviations in display.
* 06/05/2020 - Esrin - Added "Rolling <skillname>" into the chat message for FFG dice rolls to show which skill the person was rolling on.
