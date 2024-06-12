/**
 * Registers enrichers for the Journal pages - automatically runs the regex and replaces it with the return value of the function
 */
export function register_dice_enricher() {
  const dicetheme = game.settings.get("starwarsffg", "dicetheme");
  // ability die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(ability):|\[(AB)(ILITY)?\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add("starwars");
        element.classList.add("ability");
        element.append("d");
        return element;
      }
  });
    // advantage die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(advantage):|\[(AD)(VANTAGE)?\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("advantage");
        element.append("a");
        return element;
      }
  });
  // difficulty die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(average):/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("difficulty");
        element.append("di");
        return element;
      }
  });
  // boost die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(boost):|\[(BO)(OST)?\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add("starwars");
        element.classList.add("boost");
        element.append("b");
        return element;
      }
  });
  // challenge die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(challenge):|\[(CH)(ALLENGE)?\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add("starwars");
        element.classList.add("challenge");
        element.append("c");
        return element;
      }
  });
  // dark die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(darkside):|\[(DA)(RK)?\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("dark");
        element.append("z");
        return element;
      }
  });
  // difficulty die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(daunting):/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("difficulty");
        element.append("dddd");
        return element;
      }
  });
  // despair die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(despair):|\[(DE)(SPAIR)?\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("despair");
        element.append(dicetheme === "starwars" ? "y" : "d",);
        return element;
      }
  });
  // difficulty die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(difficulty):|\[(DI)(FFICULTY)?\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add("starwars");
        element.classList.add("difficulty");
        element.append("d");
        return element;
      }
  });
  // difficulty die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(easy):/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("difficulty");
        element.append("d");
        return element;
      }
  });
  // challenge die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(easy-1):/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("challenge");
        element.append("c");
        return element;
      }
  });
  // forcepoint die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(forcepip):|\[(FP|FORCEPOINT)\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("forcepoint");
        element.append("Y");
        return element;
      }
  });
  // difficulty die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(formidable):/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("difficulty");
        element.append("ddddd");
        return element;
      }
  });
  // failure die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(failure):|\[(FA)(ILURE)?\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("failure");
        element.append("f");
        return element;
      }
  });
  // force die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(force):|\[(FO)(RCE)?\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("force");
        element.append("C");
        return element;
      }
  });
  // difficulty die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(hard):/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("difficulty");
        element.append("ddd");
        return element;
      }
  });
  // light die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(lightside):|\[(LI)(GHT)?\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("light");
        element.append("Z");
        return element;
      }
  });
  // proficiency die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(proficiency):|\[(PR)(OFICIENCY)?\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add("starwars");
        element.classList.add("proficiency");
        element.append("c");
        return element;
      }
  });
  // remsetback die
  CONFIG.TextEditor.enrichers.push({
    pattern: /\[(RE)(STRICTED)?\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("remsetback");
        element.append("z");
        return element;
      }
  });
  // setback die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(setback):|\[(SE)(TBACK)?\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add("starwars");
        element.classList.add("setback");
        element.append("b");
        return element;
      }
  });
  // success die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(success):|\[(SU)(CCESS)?\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("success");
        element.append("s");
        return element;
      }
  });
  // threat die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(threat):|\[(TH)(REAT)?\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("threat");
        element.append(dicetheme === "starwars" ? "t" : "h");
        return element;
      }
  });
  // triumph die
  CONFIG.TextEditor.enrichers.push({
    pattern: /:(triumph):|\[(TR)(IUMPH)?\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("triumph");
        element.append(dicetheme === "starwars" ? "x" : "t",);
        return element;
      }
  });
  // adddifficulty die
  CONFIG.TextEditor.enrichers.push({
    pattern: /\[(DD|ADDDIFFICULTY)\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("adddifficulty");
        element.append("d");
        return element;
      }
  });
  // updifficulty die
  CONFIG.TextEditor.enrichers.push({
    pattern: /\[(UD|UPDIFFICULTY)\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("updifficulty");
        element.append("d");
        return element;
      }
  });
  // cancelthreat die
  CONFIG.TextEditor.enrichers.push({
    pattern: /\[(CT|CANCELTHREAT)\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("dietype");
        element.classList.add(dicetheme);
        element.classList.add("cancelthreat");
        element.append("t");
        return element;
      }
  });
}

export function register_oggdude_tag_enricher() {
  CONFIG.TextEditor.enrichers.push({
    pattern: /(\[B\])(.[^\[]*)\[b\]/gm,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("bold");
        element.textContent = match[2];
        return element;
      }
  });
  CONFIG.TextEditor.enrichers.push({
    pattern: /(\[P\](?![p]))/gm,
    enricher: async (match, options) => {
        let element = document.createElement("br");
        return element;
      }
  });
  CONFIG.TextEditor.enrichers.push({
    pattern: /(\[BR\])(.[^\[]*)/gm,
    enricher: async (match, options) => {
        let element = document.createElement("br");
        return element;
      }
  });
  CONFIG.TextEditor.enrichers.push({
    pattern: /(\[I\])(.[^\[]*)\[i\]/gm,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        element.classList.add("italic");
        element.textContent = match[2];
        return element;
      }
  });
  CONFIG.TextEditor.enrichers.push({
    pattern: /(\[H1\])(.[^\[]*)\[h1\]/gm,
    enricher: async (match, options) => {
        let element = document.createElement("h1");
        element.textContent = match[2];
        return element;
      }
  });
  CONFIG.TextEditor.enrichers.push({
    pattern: /(\[H2\])(.[^\[]*)\[h2\]/gm,
    enricher: async (match, options) => {
        let element = document.createElement("h2");
        element.textContent = match[2];
        return element;
      }
  });
  CONFIG.TextEditor.enrichers.push({
    pattern: /(\[H3\])(.[^\[]*)\[h3\]/gm,
    enricher: async (match, options) => {
      let element = document.createElement("h3");
      element.textContent = match[2];
      return element;
    }
  });
  CONFIG.TextEditor.enrichers.push({
    pattern: /(\[H4\])(.[^\[]*)\[h4\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("h3"); // h4 doesn't exist
        element.textContent = match[2];
        return element;
      }
  });
  CONFIG.TextEditor.enrichers.push({
    pattern: /\[h3\]/gm,
    enricher: async (match, options) => {
      let element = document.createElement("hr");
      return element;
    }
  });
}

export function register_roll_tag_enricher() {
  CONFIG.TextEditor.enrichers.push({
    pattern: /(\[ROLL\])(.[^\[]*)\[\/ROLL\]/gim,
    enricher: async (match, options) => {
        let element = document.createElement("span");
        const skill = match[2].trim().split(',')[0];
        const difficulty_num = match[2].trim().split(',')[1];
        element.classList.add("rollable");
        element.classList.add("rollSkillDirect");
        element.setAttribute("data-skill", skill);
        element.setAttribute("data-difficulty", difficulty_num);
        const inner_element = document.createElement("strong");
        let difficulty_code = "";
        for (let i = 0; i < difficulty_num; i++) {
            difficulty_code += "[DI]";
        }
        let difficulty_string = "";
        switch (difficulty_num) {
          case "0":
            difficulty_string = "Simple";
            break;
          case "1":
            difficulty_string = "Easy";
            break;
          case "2":
            difficulty_string = "Average";
            break;
          case "3":
            difficulty_string = "Hard";
            break;
          case "4":
            difficulty_string = "Daunting";
            break;
          case "5":
            difficulty_string = "Formidable";
            break;
        }
        inner_element.append(`${difficulty_string} (${difficulty_code}) ${skill}`);
        element.append(inner_element);

        return element;
      }
  });
}
