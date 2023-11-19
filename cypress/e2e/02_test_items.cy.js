/*
this should be 01, not 02 (because testing entities requires items to be working
 */

describe("ffg-star-wars create items", () => {
  beforeEach(() => {
    cy.join();
    cy.waitUntilReady();
    cy.get('#sidebar-tabs > [data-tab="items"]').click();
  });

  it("sets up the folder", () => {
    // delete the folder
    cy.get("#items > .directory-list header h3").contains("test items").rightclick();
    cy.get("#context-menu > .context-items > .context-item").contains("Delete All").click();
    cy.get(".window-content > .dialog-buttons > .yes").click().should("not.exist");

    // create the folder
    cy.get('#items > .directory-header > .header-actions > .create-folder').click().then(function () {
      cy.get(':nth-child(3) > .form-fields > input').type('test items');
      cy.get('form > button').click().then(function () {
        // wait for the window to go away
        cy.get('[type="color"]').should('not.be.visible');
      });
    });
  });
  /*
  it("creates an ability", () => {
    cy.get('.folder-header > .create-document > .fa-suitcase').click();
    cy.get('.form-fields > input').should('be.enabled');
    cy.get('.form-fields > input').type('ability');
    cy.get('.dialog-button').click();
    // wait for the item sheet to open
    cy.get('.profile-img').should('be.visible');
    cy.get('.charname > input').should('have.value', 'ability');
  });

  it("creates armor", () => {
    cy.get('.folder-header > .create-document > .fa-suitcase').click();
    cy.get('.form-fields > input').should('be.enabled');
    cy.get('.form-fields > input').type('armor');
    cy.get(':nth-child(2) > .form-fields > select').select('armour');
    cy.get('.dialog-button').click();
    // wait for the item sheet to open
    cy.get('.profile-img').should('be.visible');
    cy.get('.charname > input').should('have.value', 'armor');
    cy.get('.itemmodifier > .attribute > .block-background > .block-attribute > .item-pill-list').should('be.visible');
    cy.get('.itemmodifier > .attribute > .block-background > .block-attribute > .item-pill-list').should('be.visible');
    cy.get(':nth-child(4) > .characteristic-label').should('be.visible');
    cy.get('.ranked-toggle').should('be.visible');
  });

  it("creates a career", () => {
    cy.get('.folder-header > .create-document > .fa-suitcase').click();
    cy.get('.form-fields > input').should('be.enabled');
    cy.get('.form-fields > input').type('career');
    cy.get(':nth-child(2) > .form-fields > select').select('career');
    cy.get('.dialog-button').click();
    // wait for the item sheet to open
    cy.get('.profile-img').should('be.visible');
    cy.get('.charname > input').should('have.value', 'career');
  });

  it("creates critical damage", () => {
    cy.get('.folder-header > .create-document > .fa-suitcase').click();
    cy.get('.form-fields > input').should('be.enabled');
    cy.get('.form-fields > input').type('critical damage');
    cy.get(':nth-child(2) > .form-fields > select').select('criticaldamage');
    cy.get('.dialog-button').click();
    // wait for the item sheet to open
    cy.get('.profile-img').should('be.visible');
    cy.get('.charname > input').should('have.value', 'critical damage');
    cy.get('.block-attribute > :nth-child(1) > input').should('have.value', 0);
    cy.get('.block-attribute > select').should('have.value', '1'); // easy
  });

  it("creates critical injury", () => {
    cy.get('.folder-header > .create-document > .fa-suitcase').click();
    cy.get('.form-fields > input').should('be.enabled');
    cy.get('.form-fields > input').type('critical injury');
    cy.get(':nth-child(2) > .form-fields > select').select('criticalinjury');
    cy.get('.dialog-button').click();
    // wait for the item sheet to open
    cy.get('.profile-img').should('be.visible');
    cy.get('.charname > input').should('have.value', 'critical injury');
    cy.get('.block-attribute > :nth-child(1) > input').should('have.value', 0);
    cy.get('.block-attribute > select').should('have.value', '1'); // easy
  });

  it("creates force power", () => {
    cy.get('.folder-header > .create-document > .fa-suitcase').click();
    cy.get('.form-fields > input').should('be.enabled');
    cy.get('.form-fields > input').type('force power');
    cy.get(':nth-child(2) > .form-fields > select').select('forcepower');
    cy.get('.dialog-button').click();
    // wait for the item sheet to open
    cy.get('.talent-header > :nth-child(3)').should('be.visible').and('have.text', 'Basic Power');
    cy.get('.talent-header > :nth-child(3)').should('be.visible');
  });

  it("creates gear", () => {
    cy.get('.folder-header > .create-document > .fa-suitcase').click();
    cy.get('.form-fields > input').should('be.enabled');
    cy.get('.form-fields > input').type('gear');
    cy.get(':nth-child(2) > .form-fields > select').select('gear');
    cy.get('.dialog-button').click();
    // wait for the item sheet to open
    cy.get('.charname > input').should('have.value', 'gear');
    cy.get(':nth-child(2) > .characteristic-label').should('be.visible').and('contain.text', 'Rarity');
  });

  it("creates item attachment", () => {
    cy.get('.folder-header > .create-document > .fa-suitcase').click();
    cy.get('.form-fields > input').should('be.enabled');
    cy.get('.form-fields > input').type('item attachment');
    cy.get(':nth-child(2) > .form-fields > select').select('itemattachment');
    cy.get('.dialog-button').click();
    // wait for the item sheet to open
    cy.get('.charname > input').should('have.value', 'item attachment');
    cy.get('.profile-img').should('be.visible');
    cy.get(':nth-child(2) > .characteristic-label').should('be.visible').and('contain.text', 'Rarity');
  });

  it("creates item modification", () => {
    cy.get('.folder-header > .create-document > .fa-suitcase').click();
    cy.get('.form-fields > input').should('be.enabled');
    cy.get('.form-fields > input').type('item modification');
    cy.get(':nth-child(2) > .form-fields > select').select('itemmodifier');
    cy.get('.dialog-button').click();
    // wait for the item sheet to open
    cy.get('.charname > input').should('have.value', 'item modification');
    cy.get('.profile-img').should('be.visible');
  });

  it("creates talent", () => {
    cy.get('.folder-header > .create-document > .fa-suitcase').click();
    cy.get('.form-fields > input').should('be.enabled');
    cy.get('.form-fields > input').type('talent');
    cy.get(':nth-child(2) > .form-fields > select').select('talent');
    cy.get('.dialog-button').click();
    // wait for the item sheet to open
    cy.get('.charname > input').should('have.value', 'talent');
    cy.get('.profile-img').should('be.visible');
    cy.get('.block-attribute > select').should('be.visible').and('have.value', 'Passive');
  });

  it("creates ship attachment", () => {
    cy.get('.folder-header > .create-document > .fa-suitcase').click();
    cy.get('.form-fields > input').should('be.enabled');
    cy.get('.form-fields > input').type('ship attachment');
    cy.get(':nth-child(2) > .form-fields > select').select('shipattachment');
    cy.get('.dialog-button').click();
    // wait for the item sheet to open
    cy.get('.charname > input').should('have.value', 'ship attachment');
    cy.get('.profile-img').should('be.visible');
    cy.get(':nth-child(2) > .characteristic-label').should('be.visible').and('contain.text', 'Rarity');
    cy.get('.ranked-toggle').should('be.visible');
  });

  it("creates ship weapon", () => {
    cy.get('.folder-header > .create-document > .fa-suitcase').click();
    cy.get('.form-fields > input').should('be.enabled');
    cy.get('.form-fields > input').type('ship weapon');
    cy.get(':nth-child(2) > .form-fields > select').select('shipweapon');
    cy.get('.dialog-button').click();
    // wait for the item sheet to open
    cy.get('.charname > input').should('have.value', 'ship weapon');
    cy.get('.profile-img').should('be.visible');
    cy.get(':nth-child(2) > .characteristic-label').should('be.visible').and('contain.text', 'Crit');
    cy.get(':nth-child(5) > label').should('be.visible').and('contain.text', 'Dorsal');
  });

  it("creates homestead upgrade", () => {
    cy.get('.folder-header > .create-document > .fa-suitcase').click();
    cy.get('.form-fields > input').should('be.enabled');
    cy.get('.form-fields > input').type('homestead upgrade');
    cy.get(':nth-child(2) > .form-fields > select').select('homesteadupgrade');
    cy.get('.dialog-button').click();
    // wait for the item sheet to open
    cy.get('.charname > input').should('have.value', 'homestead upgrade');
    cy.get('.profile-img').should('be.visible');
    cy.get('.ranked-toggle').should('be.visible');
  });

  it("creates signature ability", () => {
    cy.get('.folder-header > .create-document > .fa-suitcase').click();
    cy.get('.form-fields > input').should('be.enabled');
    cy.get('.form-fields > input').type('signature ability');
    cy.get(':nth-child(2) > .form-fields > select').select('signatureability');
    cy.get('.dialog-button').click();
    // wait for the item sheet to open
    cy.get('.header-fields > .talent-background > .talent-header > .talent-name > input').should('have.value', 'signature ability');
    cy.get('.talent-header > :nth-child(3)').should('be.visible').and('contain.text', 'Base Ability');
    cy.get('#upgrade1 > .talent-cost > input').should('be.visible').and('have.value', 10);
  });
  */

});
