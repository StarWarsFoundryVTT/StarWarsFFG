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
        // create the character
        cy.get('.folder-header > .create-entry').click();
        cy.get('.form-fields > input').type('character');
      });
    });


  });
  /*
  it("creates items", () => {
    cy.get('#sidebar-tabs > [data-tab="items"]').click();
  });

   */
});
