/**
 * Visits document root and accepts the license if redirected to the accept
 * license page.
 */
function acceptsLicense() {
    cy.visit("/");
    cy.url().then((url) => {
        if (url != `${Cypress.config("baseUrl")}/license`) {
            return;
        }
        cy.get("#eula-agree").check();
        cy.get("#sign").click();
    });
}

/**
 * Visits document root and authenticates as an admin if redirected.
 */
function authenticatesAsAdmin() {
    cy.visit("/");
    cy.url().then((url) => {
        if (url != `${Cypress.config("baseUrl")}/auth`) {
            return;
        }
        cy.get("#key").type("test-admin-key{enter}");
    });
}

/**
 * Installs module, but it assumes already on the add-on modules tab of setup.
 */
function installsModule($moduleList, module) {
    // Module already installed
    if ($moduleList.find(`[data-package-id="${module}"]`).length) {
        return;
    }
    cy.get(`[data-package-id="${module}"] > .package-controls > .install`).click();
    cy.get("#notifications > .notification").contains("installed successfully", { timeout: 25000 });
}

/**
 * Handles setup of the system, modules, and world.
 */
function setup() {
    acceptsLicense();
    authenticatesAsAdmin();

    cy.visit("/");
    cy.url().then((url) => {
        if (url != `${Cypress.config("baseUrl")}/setup`) {
            return;
        }

        cy.get('.sheet-tabs > [data-tab="systems"]').click();
        cy.get("#system-list").then(($systemList) => {
            // System already installed
            if ($systemList.find('[data-package-id="genesysk2"]').length) {
                return;
            }

            cy.get(".active > .setup-footer > .install-package").click();

            cy.get('[data-package-id="genesysk2"] > .package-controls > .install').click();

            cy.get("#notifications > .notification").contains("installed successfully", { timeout: 25000 });

            cy.get(".header-button.close").click();
        });

        cy.get('.sheet-tabs > [data-tab="worlds"]').click();
        cy.get("#world-list").then(($worldList) => {
            // World already exists
            if ($worldList.find('[data-package-id="integration-test-world"]').length) {
                return;
            }

            cy.get("#create-world").click();

            // Something interrupts focus during the load, so forcing the typing
            cy.get('#world-config form input[name="title"]').type("Integration Test World", { force: true });

            cy.get('#world-config form select[name="system"]').select("Star Wars FFG");

            cy.get('#world-config form [type="submit"]').click();
        });

        // Launch the world
        cy.get('[data-package-id="integration-test-world"] button[data-action="launchWorld"]').click();
    });
}

/** Promise chain until notifications are closed */
function closeNotifications() {
    cy.get("#notifications").then(($notifications) => {
        if ($notifications.children().length) {
            // Clicking them in reverse order, because (I think) it avoids a problem
            // with the notification jumping up after the click.
            cy.get("#notifications .close").last().click();

            // Might introduce some brittleness, but I don't know a better way to work around this check right now.
            cy.wait(100);

            closeNotifications();
        }
    });
}

/**
 * This is a bit of a pain because these windows could not exist.
 */
function closeInitialPopups() {
    cy.get("body").then(($body) => {
        // Dismiss the initial tour on the world
        if ($body.find(".tour").length) {
            cy.get(".tour > .step-header > .step-button").click();
        }

        $body.find(".app > .window-header > .window-title").each((_, titleEl) => {
            const title = Cypress.$(titleEl).text();

            // Dismiss a warning about running head of the foundry codebase
            if (title === "Warning") {
                cy.get(".app > .window-header > .window-title")
                    .contains("Warning")
                    .parent()
                    .parent()
                    .find(".dialog-button")
                    .click({ force: true }); // Forced because dialogs can overlap
            }
        });
    });
}

/**
 * Log in as a user
 */
function join(user = "Gamemaster") {
    //  If we try to join, but don't land on the join URL there is a problem
    cy.visit("/join");
    cy.url().should("eq", `${Cypress.config("baseUrl")}/join`);

    cy.get('select[name="userid"]').select(user);
    cy.get('button[name="join"').click();

    cy.url().should("eq", `${Cypress.config("baseUrl")}/game`);
}

function waitUntilReady() {
    // Verify that both the game and canvas are ready before continuing
    cy.window().its("game").and("have.property", "ready").and("be.true");
    cy.window().its("game").should("have.property", "canvas").and("have.property", "ready").and("be.true");

    // Re-add if the FFG system doesn't seem initialized as this is close to the
    // last thing added during initialization
    cy.get("#destinyMenu");

    // Fixed delay: Brittle, but has been used prior to using game.ready
    //cy.wait(10000);

    closeInitialPopups();
    closeNotifications();
}

/**
 * Initialize the world after logging in as the Gamemaster
 */
function initializeWorld() {
    waitUntilReady();
}

Cypress.Commands.add("setup", () => {
    setup();
});

Cypress.Commands.add("join", () => {
    join();
});

Cypress.Commands.add("initializeWorld", () => {
    initializeWorld();
});

Cypress.Commands.add("waitUntilReady", () => {
    waitUntilReady();
});
