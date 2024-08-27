import { RollFFG } from "../dice/roll.js"

async function rollPepDice(numDice, numRisk = 0, cmpText = "") {
    //let roll = await new Roll(`${numDice}dF`).roll();
    let txtRoll = `${numDice}dF`
    if(numRisk) txtRoll += " "+numRisk+"dr" // ajout des dés de risques
    let roll = await new RollFFG(txtRoll).roll();
    //let results = roll.dice[0].results.map(r => r.result); ce n'est pas des dés fudge géré en interne
    let results = roll.dice[0].results.map(r => [0,-1,-1,0,0,1,1][r.result]); //traduction en dé fudge
    console.log("Resultat du dés :", results, roll.dice[0].results.map(r => r.result))
    // Count successes and advantages
    let successes = results.filter(r => r === 1).length;
    let advantages = results.filter(r => r === -1).length;
    // if (game.modules.get("dice-so-nice")?.active) {
    //     await game.dice3d.showForRoll(roll);
    // }

    roll._total = successes; // pour ne pas avoir le calcul fudge
    // let display = await roll.render();
    // let txtCode = game.i18n.localize('tokenActionHud.template.rollPepDice').replace(/X/g, numDice) + " "+ cmpText; // pas encore trouvé comment on fait pour integer une variable

    // // Display results in the chat
    // // a garder :         <p>Résultat : ${results.map(num => {return ["-", " ", "+"][num + 1];})}</p>
    // let messageContent = `
    //     <p><strong>`+txtCode+`</strong></p>
    //     <p>Succès: ${successes}</p>
    //     <p>Advantages: ${advantages}</p>
    //     ${display}
    // `;

    // ChatMessage.create({
    //     speaker: ChatMessage.getSpeaker(),
    //     content: messageContent
    // });
    roll.toMessage({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker(),
//        flavor: `${game.i18n.localize("SWFFG.Rolling")} ${game.i18n.localize(this.roll.skillName)}...`,
      })
}
// Prompt user for the number of dice to roll //TODO: modifier le code pour la traduciton
export function lancerDesPep(titre = "Lancer le des Peps", valDef=4, cmpText=""){
    let diceCount = new Dialog({
        title: titre,
        content: `
            <form>
                <div class="form-group">
                    <label>${game.i18n.localize('tokenActionHud.template.rollNbPepDice')}:</label>
                    <input type="number" name="numDice" value="${valDef}" min="1"/>
                    <label>Riques</lable>
                    <input type="number" name="numRisk" value="0" min="0"/>
                </div>
            </form>
        `,
        buttons: {
            roll: {
                label: "Roll",
                callback: (html) => {
                    let numDice = parseInt(html.find('[name="numDice"]').val());
                    let numRisk = parseInt(html.find('[name="numRisk"]').val());
                    rollPepDice(numDice,numRisk, cmpText);
                }
            },
            cancel: {
                label: "Cancel"
            }
        },
        default: "roll"
    }).render(true);
}