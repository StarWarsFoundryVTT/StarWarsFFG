# Local Foundry compatibility tests

The browser suite targets a locally managed Foundry instance. It never connects to a shared or hard-coded server.

## Toolchain

- Node.js 24
- npm 11
- Install dependencies with `npm ci`
- Run static checks with `npm run lint`
- Run compatibility unit tests with `npm test`
- Compile Sass with `npm run compile`

## Isolated data directories

Keep separate user-data directories so opening a migration fixture in Version 14 cannot modify the Version 13 source:

```text
.foundry-data/v13-clean
.foundry-data/v13-migration-source
.foundry-data/v14-clean
.foundry-data/v14-migration-copy
```

Do not reuse a live game directory. Copy `v13-migration-source` to `v14-migration-copy` before every migration run and keep the source directory read-only or backed up.

Install or symlink this repository as `Data/systems/starwarsffg` inside each directory. Create a world using the system, create a passwordless `Gamemaster` user for automation, and disable all third-party modules.

## Selecting Foundry

Start the desired Foundry executable with its isolated data directory and a distinct port. The exact executable path is installation-specific; examples on macOS are:

```sh
"/Applications/Foundry Virtual Tabletop 13.app/Contents/MacOS/Foundry Virtual Tabletop" --dataPath="$PWD/.foundry-data/v13-clean" --port=30013
"/Applications/Foundry Virtual Tabletop 14.app/Contents/MacOS/Foundry Virtual Tabletop" --dataPath="$PWD/.foundry-data/v14-clean" --port=30014
```

Version 13 must be installed separately before running its matrix entry. Confirm the generation shown on Foundry's Setup screen; do not substitute Version 11 or 12.

Run the matching suite in another terminal:

```sh
FOUNDRY_BASE_URL=http://127.0.0.1:30013 npm run test:e2e:v13
FOUNDRY_BASE_URL=http://127.0.0.1:30014 npm run test:e2e:v14
```

The focused release matrix is:

```sh
FOUNDRY_BASE_URL=http://127.0.0.1:30013 npm run test:e2e:v13 -- e2e/compatibility-baseline.spec.js
FOUNDRY_BASE_URL=http://127.0.0.1:30014 npm run test:e2e:v14 -- e2e/compatibility-baseline.spec.js e2e/v14-smoke.spec.js e2e/v14-multiclient.spec.js
```

Run the Version 14 command once against the clean world and once against a disposable copy of the Version 13 migration fixture. Browser tests mutate their target world and must use one worker; the repository configuration enforces this.

Set `FOUNDRY_USER_NAME` if the test GM has another name and `FOUNDRY_USER_PASSWORD` if it has a password. Authentication state is written below `playwright/.auth/` and must not be committed.
The harness uses the installed Google Chrome channel by default because Foundry VTT 14 requires a newer Chromium build than Playwright currently bundles. Set `FOUNDRY_BROWSER_CHANNEL` to select another installed Playwright browser channel.

Run the recorded pre-migration mechanics check against the Version 13 migration fixture with:

```sh
FOUNDRY_BASE_URL=http://127.0.0.1:30013 FOUNDRY_MIGRATION_FIXTURE=1 npm run test:e2e:v13 -- e2e/compatibility-baseline.spec.js
```

## Migration fixture contract

The Version 13 migration source must contain representative Actor and Item subtypes, an Actor with embedded Items, direct and transferred Active Effects, disabled and finite-duration effects, an unlinked token, an FFG macro, an active combat, and a writable world Actor or Item compendium. Record prepared statistics before copying it to the Version 14 directory. Never test migration without a restorable source backup.
