describe("ffg-star-wars create entities", () => {
  beforeEach(() => {
    cy.join();
    cy.waitUntilReady();
  });

  it("creates actors", () => {
    // Clean-up crawls if they exist
    cy.get('#sidebar-tabs > [data-tab="actors"]').click();
    cy.get("#actors > .directory-list").then(($directoryList) => {
      if ($directoryList.find(".folder").length == 0) {
        return;
      }
      cy.get("#actors > .directory-list header h3").contains("actors").rightclick();

      cy.get("#context-menu > .context-items > .context-item").contains("Delete All").click();

      // Confirm
      cy.get(".window-content > .dialog-buttons > .yes").click().should("not.exist");
    });

    cy.get('#actors > .directory-header > .header-actions > .create-folder').click().then(function () {
      cy.get(':nth-child(3) > .form-fields > input').type('actors');
      cy.get('form > button').click().then(function () {
        // wait for the window to go away
        cy.get('[type="color"]').should('not.be.visible');
        // create the character
        cy.get('.folder-header > .create-document > .fa-user').click();
        cy.get('.form-fields > input').should('be.enabled');
        cy.get('.form-fields > input').type('character');
        cy.get('.dialog-button').click();
        // validate the character sheet opened up
        cy.get('.profile-img').should('be.visible');
        // make sure basic data is visible
        cy.get(':nth-child(1) > .row-input > .drag-note').should('be.visible');
        cy.get('.sheet-tabs > [data-tab="items"]').should('be.visible');
        cy.get('.sheet-tabs > [data-tab="description"]').should('be.visible');
      });
    });


  });
  /*
  it("creates items", () => {
    cy.get('#sidebar-tabs > [data-tab="items"]').click();
  });

   */
});
