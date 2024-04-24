/* fichier venant de Genesys pas encore modifié 
 */
/* Creration d'un module pour simuler le lancer de dél à la génésys
 * une zone pour ajouter les dés positifs, une pour les dés négative,
 * une zone pour la manipulation des dés
 * une zone pour le choix de la compétences et de l'attribut
 * un bouton ok, un bouton cancel
 * sur le modèle du formulaire Genesys
 */
// pas beau, represent les dés
let reserveDes = {Actor:"-", skill:"-", attrib:"-", attrib2:"-", A:0, P:0, B:0, I:0, C:0, S:0, a:0, s:0, t: 0, h:0, f:0, d:0}

export function ListeDe(actor,typeL = 'c') { // retourne la liste des caracts ou des items
    let b = { '-':'-'}
    if(actor == '-') return b;
     if(typeL=='c'){
        let a = Object.keys(actor.system.characteristics)
        a.forEach(a => { b[a]=a})
        return b;
    } else if (typeL=='s') { // skill
        // trouver le skill.
        let tabSkill = actor.items.filter( i => { if(i.type == 'skill') return i})
        let tabSkill2 = tabSkill.toSorted((a,b) => a.name > b.name)
        tabSkill2.forEach(i => { b[i.id]=i.name })
        return b;
    } else if (typeL=='w') { // skill
        // trouver le skill.
        let tabSkill = actor.items.filter( i => { if(i.type == 'weapon') return i})
        let tabSkill2 = tabSkill.toSorted((a,b) => a.name > b.name)
        tabSkill2.forEach(i => { b[i.id]=i.name })
        return b;
    }
}

function DestoHTML(codeDe = ['A','P','B','a','s','t']) {
    // sort de texte HTML en fonction des dés demandée (utiliser reserveDes)
    let ret = ""; let aff={'P':'P','A':'A','B':'B','C':'C','I':'D','S':'S','a':'a','s':'s','t':'t','h':'h','f':'f','d':'d'}
    codeDe.forEach(td =>{
        for(i = 1; reserveDes[td] >= i ;i++){
            ret += '<div class="die die-'+aff[td]+'" data-cmd="'+td+'" zoldice="">'+aff[td]+'</div>'
        }
    })
    return ret;
}

function changeReserve(formEle, typeD=true){
    let Des = []
    let clasSelect = '[class="positive"]'
    if(typeD) {
        Des =  ['P','A','B','a','s','t']
    }else {
        clasSelect = '[class="negative"]'
        Des =  ['C','I','S','h','f','d']
    }
    formEle.find(clasSelect).html(DestoHTML(Des))
    formEle[0]["obj"].value =JSON.stringify(reserveDes).replaceAll('"','|');
}

function isDesPositif(cd='A') { // est dans la partie positive
    return ['A','P','B','a','s','t'].includes(cd)
}

function handleDeChangement(event){
    const targetElement = event.currentTarget;
    const presetType = targetElement.dataset?.cmd;
    const formElement = $(targetElement).parents('form');

    const codeDe = presetType[0];// le code dés : A,P,B,I,C,S,a,s,t,h,f,d
    const codeAction = presetType[1]; // l'action : +, U, D
    let Modif = false
    switch(codeAction){
        case '+': // ajout du dé
            reserveDes[codeDe]++
            Modif = true
            break;
        case 'U': // upgrade d'un dé P ou D
            switch(codeDe) {
                case "A":
                    if(reserveDes.P == 0) {
                        reserveDes.P++
                        Modif = true
                    } else {
                        reserveDes.A--
                        reserveDes.P++
                        Modif = true
                    }
                    break
                case "I":
                    if(reserveDes.I == 0) {
                        reserveDes.I++
                        Modif = true
                    } else {
                        reserveDes.I--
                        reserveDes.C++
                        Modif = true
                    }
                    break;
            }
            break
        case 'D': // réudction d'un des dés A ou C
        switch(codeDe) {
            case "P":
                if(reserveDes.P > 0) {
                    reserveDes.P--
                    reserveDes.A++
                    Modif= true
                }
                break
            case "C":
                if(reserveDes.C > 0) {
                    reserveDes.C--
                    reserveDes.I++
                    Modif= true
                }
                break;
    }

            break;
    }
    if(Modif){
        changeReserve(formElement,isDesPositif(codeDe))
    }
}

function handleDeSuppr(event) {
    const targetElement = event.currentTarget;
    const codeDe = targetElement.dataset?.cmd;
    const formElement = $(targetElement).parents('form');
    if(['P','A','B','a','s','t','C','I','S','h','f','d'].includes(codeDe)){
        reserveDes[codeDe]--; // existe obligatoirement car c'est un click direct.
        changeReserve(formElement,isDesPositif(codeDe))
    }
}

function handleChangeSelect(event){
    const targetElement = event.currentTarget;
    const codeDe = targetElement.dataset?.cmd;
    const formElement = $(targetElement).parents('form');
    const actor = game.actors.get(reserveDes.Actor)
    let val1 = 0; let val2 = 0;
    if(targetElement.name =='skill') {
        if(reserveDes.skill === undefined) { // le attrib2 est changer
            reserveDes.attrib2 = targetElement.value
        } else { // le Skill est changer
            reserveDes.skill = targetElement.value
        }
    } else { // caracateristique
        reserveDes.attrib = targetElement.value
    }
    val1=actor.system.characteristics[reserveDes.attrib]
    if(reserveDes.skill === undefined) {
        val2=actor.system.characteristics[reserveDes.attrib2]
    } else { // skill => utilise item
        const item = actor.items.get(reserveDes.skill)
        val2 = item.system.rank
    }
    let ProD =  Math.min(val1,val2); // le minimum est le nombre de D12
    let AbD = Math.max(val1,val2);
    AbD = AbD - ProD; // le reste est en D8
    reserveDes.A = AbD
    reserveDes.P = ProD
    console.log("Lancer Val :",val1,val2,"donne ", AbD, ProD)
    changeReserve(formElement,true) // change la partie positive
}
// XXX a modifier car correspond à npqv1 test de validation fin
// function verifSyntheseData(formData) {
    // Verification possible : nombre de Dés au dela de 0
    // if (!formData?.score) {
    //   throw new Error('Score is required');
    // }

    // if (!formData?.des) {
    //   throw new Error('Dés is required');
    // }
    // if (formData?.dommage) {
    //   if(formData?.dommage.toUpperCase().indexOf("D") == -1)
    //     throw new Error('Dommage necessite un dé');
    // }
//   }

export  async function DicePromptGenesys(parChamp1="brawn", parChamp2 = "-", parDices ={Actor:"-", skill:"-", attrib:"-", attrib2:"-", A:0, P:0, B:0, I:0, C:0, S:0, a:0, s:0, t: 0, h:0, f:0, d:0}, valChamp1={}, valChamp2={}){ // A: Abylitye
    let dommageFormule = "3d6"
    let lstAttrib = valChamp1
    let lstValCmp = valChamp2
    let parValChamp = parChamp2
    if(parChamp2 == '-') {  // jet de caract, donc deux fois les attributs, avec par défaut l'attribut identique
        lstValCmp = valChamp1
        parValChamp = parChamp1
    }
    Object.keys(parDices).forEach(key => { reserveDes[key]=parDices[key]}) // recopie dans la globale
    let DesPos =  ['P','A','B','a','s','t']
    let DesNeg =  ['C','I','S','h','f','d']
    context = {
        attribV : lstAttrib,
        lstCmp : lstValCmp,
        dommage: dommageFormule,
        description : "Utilisez la boîte à dés sur la droite pour ajouter, améliorer et rétrograder. Cliquez sur les dés dans la réserve pour les retirer !", // a traduire
        objValue : JSON.stringify(reserveDes).replaceAll('"','|'),
        lstDesPos : DestoHTML(DesPos),
        lstDesNeg : DestoHTML(DesNeg),
        SelectAttrib : parChamp1,
        SelectCmp : parValChamp
      };
    const htmlContent = await renderTemplate('/modules/fvtt-token-action-hud-genesys/templates/DicePromt.hbs', context);
    return new Promise((resolve, reject) => {
        const dialog = new Dialog({
          title: "Modificateur de lancer",
          content: htmlContent,
          buttons: {
            cancel: {
              label: "Cancel",
              callback: () => reject('User canceled.'),
            },
            submit: {
              label: "Jet!", // a traduire
              icon: '<i class="fas fa-check"></i>',
              callback: (html) => {
                const formData = new FormDataExtended(html[0].querySelector('form'))
                  .toObject();
                  //verifSyntheseData(formData);
                resolve(formData);
              },
            },
          },
          render: (html) => {
            //html.on('click', 'button[data-preset]', handleCranPreset);
            html.on('click', 'a[zoldice]', handleDeChangement);
            html.on('click', '.die[zoldice]', handleDeSuppr)
            html.on('change', 'select[zoldice]',handleChangeSelect)
            // let formElement = $(html).parents('form')
            // changeReserve(formEle,true)
            // changeReserve(formEle,false)
            console.log("mettre le bon html.on")
          },
          close: () => {
            reject('User closed dialog without making a selection.');
          },
        });

        dialog.render(true);
      });
}  