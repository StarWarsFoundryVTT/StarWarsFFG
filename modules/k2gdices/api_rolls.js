/* fichier venant de Genesys pas encore modifié 
 */

//import DicePrompt from "/systems/genesys/Genesys.js"
// recupération des renders dans GenesysRoller.js
import { DicePromptGenesys, ListeDe } from './DicePrompGenesys.js'
/* Code Dé
* Ability (Green) 	dA
* Proficiency (Yellow) 	dP
* Boost (Blue) 	dB
* Difficulty (Purple) 	dI
* Challenge (Red) 	dC
* Setback (Black) 	dS
*/
// export function lancerCarac(actor, itemn, option = {}) {
//     DicePrompt.promptForRoll(actor, "-")
// }
export function lancerDesUi(des = {Actor:"-", skill:"-", attrib:"-", attrib2:"-", A:0, P:0, B:0, I:0, C:0, S:0, a:0, s:0, t: 0, h:0, f:0, d:0}){
    // fournis l'entrée du formulaire de lancer de dés
    // liaison entre DicePrompGenesys et ici
     let actor = '-'; let skill = '-'; let lstAttr = {}; let lst2 = {}; let item = '-'
    if(des.Actor != '-') {
        actor = game.actor.get(des.Actor) // les attributs
        lstAttr=ListeDe(actor)
        lst2 = lstAttr // les deux liste sont des caracts par défaut
    }
    if(des.Actor != '-' && des.skill != '-') {
        item = actor.items.get(des.skill)
        lst2 = ListeDe(actor,'s')
    } else if(des.Actor == '-' && des.skill != '-') item = game.items.get(des.skill)
    // let desMini = {A:0,P:0,B:0,C:0,I:0,S:0}
    // Object.keys(desMini).forEach((ele) => { desMini[ele] = des[ele]})
    LancerDesUiObj(actor, item, des)
    // DicePromptGenesys(des.attrib, des.attrib2, desMini,lstAttr, lst2).then((v)=>{
    //     console.log(v)
    //     let obj = JSON.parse(v.obj.replaceAll("|",'#'))
    //     jetDirect(actor, item, obj)
    // })
}

export function LancerDesUiObj(actor, item, des= {Actor:"-", skill:"-", attrib:"-", attrib2:"-", A:0, P:0, B:0, I:-1, C:0, S:0, a:0, s:0, t: 0, h:0, f:0, d:0}){
    // ici on as les objets passé en paramètre => fixe les choses
    let objDes = {Actor:"-", skill:"-", attrib:"-", attrib2:"-", A:0, P:0, B:0, I:-1, C:0, S:0, a:0, s:0, t: 0, h:0, f:0, d:0}
    des = jQuery.extend(objDes, des); //validation des champs minimmu
    if(actor == '-') des.Actor = "personne" // a traduire
        else des.Actor = actor.id
    if(item != '-')des.skill = item.id
    let lstAttr=ListeDe(actor)
    let lst2 = lstAttr // les deux liste sont des caracts par défaut
    let val1 =0
    let val2 = 0
    if(item != '-') {
        if(item.type == 'skill') {
            des.skill = item.id
            des.attrib2 = item.name
            des.attrib =  item.system.characteristic
            lst2 = ListeDe(actor,'s')
            val1 = actor.system.characteristics[item.system.characteristic] // la caractéristique du personnage
            val2 = item.system.rank
        }else if(item.type == 'weapon'){
            des.attrib2 = item.name
            let skillWeapon = undefined
            item.system.skills.forEach(nameSkill => {
                if(skillWeapon == undefined) skillWeapon = actor.items.getName(nameSkill) // trouver le premier
            })
            if(skillWeapon != undefined) {
                des.attrib = skillWeapon.system.characteristic
                val1 = actor.system.characteristics[des.attrib]
                val2 = skillWeapon.system.rank
            }
            lst2 = ListeDe(actor,'w') // a finir
            console.log("Armes : ?", item)
        }
    } else { // les carac, si on a un acteur
        if(actor=='-') {
            val1 = 1
            val2 = 0
        } else  {
            if(des.attrib != '-')val1 = actor.system.characteristics[des.attrib]
            if(des.attrib2 != '-')val2 = actor.system.characteristics[des.attrib2]
        }
    }
    let ProD =  Math.min(val1,val2); // le minimum est le nombre de D12
    let AbD = Math.max(val1,val2);
    AbD = AbD - ProD; // le reste est en D8
    des.A = AbD
    des.P = ProD
    console.log("Lancer Val :",val1,val2,"donne ", AbD, ProD)
    if(des.I == -1) des.I = 2; // difficulté par défaut...
    //ici la récuper des objets
    DicePromptGenesys(des.attrib, des.skill, des, lstAttr, lst2).then((v)=>{
        console.log(v)
        const obj = JSON.parse(v.obj.replaceAll("|",'"'))
        jetDirect(actor, item, obj)
    })
}
/**
 *
 *
 * @export
 * @param {object} actor
 * @param {object} item
 * @param {object} [cmd={ "code":"" }]
 */
export function lancerDeDes(actor, item, cmd= { "code":"" }){
    let val1 = 0; let val2 = 0
    let atr =""
    if(item == undefined) item = "-"
    if(item == "-" ){ // lancer de caract
        // actuellement une seul caract
        val1 = actor.system.characteristics["braw"]
        atr = "braw"
        val2 = 0
    } else { // lancer de compétence ou de combat
        val1 = actor.system.characteristics[item.system.characteristic] // la caractéristique du personnage
        val2 = item.system.rank
        atr = item.name
    }
    let ProD =  Math.min(val1,val2); // le minimum est le nombre de D10
    let AbD = Math.max(val1,val2);
    AbD = AbD - ProD; // le reste est en D6
    let des = {Actor:actor.id, skill:item.id, attrib:item.system.characteristic, attrib2:atr, A:AbD, P:ProD, B:0, I:2, C:0, S:0, a:0, s:0, t: 0, h:0, f:0, d:0}
    jetDirect(actor, item, des)
}

function jetDirect(actor, item, des = {Actor:"-", skill:"-", attrib:"-", attrib2:"-", A:0, P:0, B:0, D:0, C:0, S:0, a:0, s:0, t: 0, h:0, f:0, d:0}) {
    let formula = ""
    const typeD = ['A','P','B','I','C','S'] // bizzarement le tableau passe pas directement
    typeD.forEach((element) => {
        if(des[element] > 0) formula += des[element] + 'd'+element+'+'
    });
    formula = formula.substring(0,formula.length-1) // réduction du dernier +
    //if(des.S > 0) formula += des.S +"dS "
    let TypeJet="skill.hbs"
    let description = "Jet de " + item.name + " de " + actor.name
    let R = new Roll(formula);
    R.evaluate({async :false });
    // Forme de terms (array(3)) contient trois membre chacun avecs D10 et D6 resultat

// affichage brute
//         R.toMessage({
//         user: game.user.id,
// //        flavor: msgFlavor,
//         speaker: ChatMessage.getSpeaker({actor: actor}),
//         flags : {msgType : "damage"}
//     });
    const SymbolSup = ['a','s','t','h','f','d']
    let symbols = {}
    let nbS = 0
    SymbolSup.forEach((ele)=>{
        if(des[ele]>0) {
            symbols[ele]=des[ele] // transmission des symboles fournis
            nbS += des[ele]
        }
    })
    if(nbS > 0) R.symbols = symbols
    const results = parseRollResults(R)
    console.log("Resultat",results);
    let rollData = {}
    if(item == "-"){
        description = "Jet de "+ des.attrib + " avec "+ des.attrib2
        rollData = {
            description: description,
            results,
        };
    } else if(item?.type != "skill") { // weapons ?
        let weapon = item
        TypeJet= "attack.hbs"
        let description = "Attaque de " + item.name + " de " + actor.name
        let totalDamage = weapon.systemData.baseDamage;
        let damageFormula = weapon.systemData.baseDamage.toString();
        if (actor && weapon.systemData.damageCharacteristic !== '-') {
            totalDamage += actor.system.characteristics[weapon.systemData.damageCharacteristic];
            damageFormula = game.i18n.localize(`Genesys.CharacteristicAbbr.${weapon.systemData.damageCharacteristic.capitalize()}`) + ` + ${damageFormula}`;
        }
        if (results.netSuccess > 0) {
            totalDamage += results.netSuccess;
        }
        if (des.skill === '-') {
            if (characteristic) {
                description = game.i18n.format('Genesys.Rolls.Description.AttackCharacteristic', {
                    name: weapon.name,
                    characteristic: game.i18n.localize(`Genesys.Characteristics.${characteristic.capitalize()}`),
                });
            }
        }
        const attackQualities = weapon.systemData.qualities;
        attackQualities.map(async (quality) => {
            quality.description = await TextEditor.enrichHTML(quality.description, { async: true });
        });
        rollData = {
            description: description,
            results,
            totalDamage,
            damageFormula,
            critical: weapon.systemData.critical,
            // tbh I can't be assed to implement another Handlebars helper for array length so let's just do undefined.            qualities: weapon.systemData.qualities.length === 0 ? undefined : attackQualities,
            showDamageOnFailure: false //game.settings.get(settings_1.NAMESPACE, campaign_1.KEY_SHOW_DAMAGE_ON_FAILURE),
        };
    } else {
        rollData = {
            description: description,
            results,
        };

    }
    renderTemplate('systems/genesys/templates/chat/rolls/'+TypeJet, rollData).then(html => {
        //console.log("Texte HTLM",html)
        const chatData = {
            user: game.user.id,
            speaker: { actor: actor?.id },
            rollMode: game.settings.get('core', 'rollMode'),
            content: html,
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            R
        };
        ChatMessage.create(chatData);

    })

}

function parseRollResults(roll) {
    const faces = roll.dice.reduce((faces, die) => {
        const genDie = die;
        if (faces[genDie.denomination] === undefined) {
            faces[genDie.denomination] = die.results.map((r) => genDie.getResultLabel(r));
        }
        else {
            faces[genDie.denomination].concat(die.results.map((r) => genDie.getResultLabel(r)));
        }
        return faces;
    }, {});
    // Get symbols from the dice results.
    const results = Object.values(faces)
        .flatMap((v) => v)
        .flatMap((v) => v.split(''))
        .filter((v) => v !== ' ')
        .reduce((results, result) => {
        results[result] += 1;
        return results;
    }, {
        a: 0,
        s: 0,
        t: 0,
        h: 0,
        f: 0,
        d: 0,
    });
    // Add extra symbols specified by the roll.
    const extraSymbols = roll.symbols;
    if (extraSymbols) {
        for (const symbol of ['a', 's', 't', 'h', 'f', 'd']) {
            results[symbol] += extraSymbols[symbol] ?? 0;
        }
    }
    // Threat & Triumph add successes & failures.
    results['s'] += results['t'];
    results['f'] += results['d'];
    return {
        totalSuccess: results['s'],
        totalFailures: results['f'],
        totalAdvantage: results['a'],
        totalThreat: results['h'],
        totalTriumph: results['t'],
        totalDespair: results['d'],
        netSuccess: results['s'] - results['f'],
        netFailure: results['f'] - results['s'],
        netAdvantage: results['a'] - results['h'],
        netThreat: results['h'] - results['a'],
        faces,
        extraSymbols,
    };
}