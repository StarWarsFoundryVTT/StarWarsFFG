/**
 * A specialized form used to pop out the editor.
 * @extends {FormApplication}
 */
export default class PopoutEditor extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "popout-editor",
      classes: ["starwarsffg", "sheet"],
      title: "Pop-out Editor",
      template: "systems/starwarsffg/templates/popout-editor.html",
      width: 320,
      height: 320
    });
  }

  /**
   * Return a reference to the target attribute
   * @type {String}
   */
  get attribute() {
	  return this.options.name;
  }

  /** @override */
  getData() {
    // Get current value
    let attr = getProperty(this.object.data, this.attribute);

    // Return data
	  return {
      value : attr,
      cssClass : "editable popout-editor-window"
     }
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {
    const updateData = {};
    updateData[`${this.attribute}`] = formData.value;
    
    // Update the object
    this.object.update(updateData);

    this.close();
  }
  
  /**
   * Renders the dice symbols based on strings
   * @param  {String} string
   */
  static renderDiceImages(str) {
    let html = str || "";

    const replaceValues = [
      {
        type : "ability",
        character: "d",
        pattern: /\[(AB)[a-zA-Z]*\]/gmi
      },
      {
        type : "advantage",
        character: "a",
        pattern:/\[(AD)[a-zA-Z]*\]/gmi
      },
      {
        type : "boost",
        character: "b",
        pattern:/\[(BO)[a-zA-Z]*\]/gmi
      },
      {
        type : "challenge",
        character: "c",
        pattern:/\[(CH)[a-zA-Z]*\]/gmi
      },
      {
        type : "dark",
        character: "z",
        pattern:/\[(DA)[a-zA-Z]*\]/gmi
      },
      {
        type : "despair",
        character: "y",
        pattern:/\[(DE)[a-zA-Z]*\]/gmi
      },
      {
        type : "difficulty",
        character: "d",
        pattern:/\[(DI)[a-zA-Z]*\]/gmi
      },
      {
        type : "forcepoint",
        character: "Y",
        pattern:/\[(FP[a-zA-Z]*|FORCEPOINT)\]/gmi
      },
      {
        type : "failure",
        character: "f",
        pattern: /\[(FA)[a-zA-Z]*\]/gmi
      },
      {
        type : "force",
        character: "C",
        pattern:/\[(FO)[a-zA-Z]*\]/gmi
      },
      {
        type : "light",
        character: "Z",
        pattern:/\[(LI)[a-zA-Z]*\]/gmi
      },
      {
        type : "proficiency",
        character: "c",
        pattern:/\[(PR)[a-zA-Z]*\]/gmi
      },
      {
        type : "setback",
        character: "b",
        pattern:/\[(SE)[a-zA-Z]*\]/gmi
      },
      {
        type : "success",
        character: "s",
        pattern:/\[(SU)[a-zA-Z]*\]/gmi
      },
      {
        type : "threat",
        character: "t",
        pattern:/\[(TH)[a-zA-Z]*\]/gmi
      },
      {
        type : "triumph",
        character: "x",
        pattern:/\[(TR)[a-zA-Z]*\]/gmi
      }
    ]

    replaceValues.forEach(item => {
      html = html.replace(item.pattern, `<span class='dietype ${item.type}'>${item.character}</span>`)
    })

    return html;
  }

}