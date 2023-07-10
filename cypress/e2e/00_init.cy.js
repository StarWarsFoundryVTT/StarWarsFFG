describe("ffg-star-wars init", () => {
    before(() => {
        cy.setup();
    });
    beforeEach(() => {
        cy.join();
        cy.initializeWorld();
    });

    it("initializes the world", () => {
        // Having this test run first more accurately estimates test durations
        cy.log("Initialization complete");
    });
});
