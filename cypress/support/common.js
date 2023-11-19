export function cleanup_actors() {
    cy.get('[data-tab="actors"] > .fas').click();
    cy.get("#actors > .directory-list").then(($actorList) => {
        if ($actorList[0].children.length === 0) {
            return;
        }
        // Confirm
        cy.get(".actor > .document-name > a").rightclick();
        cy.get(".context-items > :nth-child(1)").click();
        cy.get(".yes").click();
    });
}

/**
 * Clears the entire chat history
 */
export function clear_chat() {
    cy.get(".fa-comments").click();
    cy.get(".delete > .fas").click();
    cy.get(".yes").click();
}
