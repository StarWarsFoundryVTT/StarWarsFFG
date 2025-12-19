const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class CharacterCreator extends HandlebarsApplicationMixin(ApplicationV2) {
  // https://foundryvtt.wiki/en/development/api/applicationv2
  static PARTS = {
    header: { template: 'systems/starwarsffg/templates/wizards/char_creator/header.html' },
    tabs: { template: 'templates/generic/tab-navigation.hbs' },
    rules: {
      template: 'systems/starwarsffg/templates/wizards/char_creator/tabs/rules.html'
    },
    background: {
      template: 'systems/starwarsffg/templates/wizards/char_creator/tabs/background.html'
    },
    startingBonus: {
      template: 'systems/starwarsffg/templates/wizards/char_creator/tabs/startingBonus.html'
    },
    obligation: {
      template: 'systems/starwarsffg/templates/wizards/char_creator/tabs/obligation.html'
    },
    species: {
      template: 'systems/starwarsffg/templates/wizards/char_creator/tabs/another_tab.html'
    },
    career: {
      template: 'systems/starwarsffg/templates/wizards/char_creator/tabs/another_tab.html'
    },
    specialization: {
      template: 'systems/starwarsffg/templates/wizards/char_creator/tabs/another_tab.html'
    },
    xp_spending: {
      template: 'systems/starwarsffg/templates/wizards/char_creator/tabs/another_tab.html'
    },
    motivation: {
      template: 'systems/starwarsffg/templates/wizards/char_creator/tabs/another_tab.html'
    },
    gear: {
      template: 'systems/starwarsffg/templates/wizards/char_creator/tabs/another_tab.html'
    },
    review: {
      template: 'systems/starwarsffg/templates/wizards/char_creator/tabs/another_tab.html'
    },
    //footer: { template: 'systems/starwarsffg/templates/wizards/char_creator/footer.html' },
  }

  /** @type {Record<string, foundry.applications.types.ApplicationTabsConfiguration>} */
  static TABS = {
    primary: {
      tabs: [
        // https://foundryvtt.wiki/en/development/guides/Tabs-and-Templates/Tabs-in-AppV2
        {
          id: "rules",
          label: "rules"
        },
        {
          id: "background",
          label: "background"
        },
        {
          id: "startingBonus",
          label: "startingBonus"
        },
        {
          id: "obligation",
          label: "obligation"
        },
      ],
      //labelPrefix: "MYSYS.tab", // Optional. Prepended to the id to generate a localization key
      initial: "rules", // Set the initial tab
    },
  };

  static DEFAULT_OPTIONS = {
    tag: "form",
    form: {
      handler: CharacterCreator.myFormHandler,
      submitOnChange: false,
      closeOnSubmit: false
    },
    actions: {
      selectRules: CharacterCreator.selectRules,
      selectStartingBonus: this.selectStartingBonus,
    },
    position: {
      width: 600,
      height: 400,
    },
    classes: ["starwarsffg", "wizard", "charCreator"],
  }

  constructor(options={}) {
    super(options);
    this.data = {
      rules: "fad",
      starting: {
        xp: 0,
        credits: 0,
        duty: 0,
        obligation: 0,
        conflict: 0,
        species: null,
        specialization: null,
        xp_spend: null,
        derived_attributes: null,
        motivation: null,
        gear: null,
      },
      bonus: {
        xp: 0,
        credits: 0,
        duty: 0,
        obligation: 0,
        conflict: 0,
      },
      current: {
        xp: 0,
        credits: 0,
        duty: 0,
        obligation: 0,
        conflict: 0,
        startingBonus: "",
      },
    };
    this.builtin = {
      rules: {
        fad: "Force and Destiny",
        aor: "Age of Rebellion",
        eote: "Edge of the Empire",
      },
    };
  }

  /** @override */
  /*
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    // This fills in `options.parts` with an array of ALL part keys by default
    // So we need to call `super` first
    super._configureRenderOptions(options);
    // Completely overriding the parts
    options.parts = ['header', 'tabs']
    // Don't show the other tabs if only limited view
    if (this.document?.limited) return;
    // Keep in mind that the order of `parts` *does* matter
    // So you may need to use array manipulation
    switch (this.document?.type) {
      case 'typeA':
        options.parts.push('foo')
        break;
      case 'typeB':
        options.parts.push('bar')
        break;
    }
  }

   */

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    console.log("render")

    // backgrounds
    new SlimSelect({
      select: '#culture',
      cssClasses: {
        option: "starwarsffg" // TODO: select a real class here
      },
      events: {
        afterChange: async (newVal) => {
          // could be >1 but we only allow one here
          await this.selectCulture(newVal[0].value, newVal[0].text);
        }
      }
    });
    new SlimSelect({
      select: '#hook',
      cssClasses: {
        option: "starwarsffg" // TODO: select a real class here
      },
      events: {
        afterChange: async (newVal) => {
          // could be >1 but we only allow one here
          await this.selectHook(newVal[0].value, newVal[0].text);
        }
      }
    });
    new SlimSelect({
      select: '#force_attitude',
      cssClasses: {
        option: "starwarsffg" // TODO: select a real class here
      },
      events: {
        afterChange: async (newVal) => {
          // could be >1 but we only allow one here
          await this.selectForceAttitude(newVal[0].value, newVal[0].text);
        }
      }
    });
    // obligations
    // TODO: permit multiple choices
    new SlimSelect({
      select: '#obligation_choice',
      cssClasses: {
        option: "starwarsffg" // TODO: select a real class here
      },
      events: {
        afterChange: async (newVal) => {
          await this.selectObligation(newVal[0].value, newVal[0].text);
        }
      }
    });
  }


  /**
   * Process form submission for the sheet
   * @this {CharacterCreator}                      The handler is called with the application as its bound scope
   * @param {SubmitEvent} event                   The originating form submission event
   * @param {HTMLFormElement} form                The form element that was submitted
   * @param {FormDataExtended} formData           Processed data for the submitted form
   * @returns {Promise<void>}
   */
  static async myFormHandler(event, form, formData) {
    // Do things with the returned FormData
    console.log("form handler")
    console.log(formData)
  }

  /** @override */
  async _prepareContext() {
    // essentially, this takes the place of getData
    // only data returned by this is available to the template
    // async _preparePartContext(partId, context) may be used for specific parts
    const context = {
      // ...
      /** @type {Record<string, foundry.applications.types.ApplicationTab} */
      tabs: this._prepareTabs("primary"),
      data: this.data,
      builtin: this.builtin,
    };


    context.availableBackgrounds = await this.getBackgrounds();
    context.startingBonusesRadio = CONFIG.FFG.characterCreator.startingBonusesRadio[this.data.rules];
    const obligations = await this.getAvailableMoralities(this.data.rules);
    context.availableMoralities = obligations.moralities;
    context.availableObligations = obligations.obligations;
    context.availableDuties = obligations.duties;
    /*
    this.terms = await Promise.all(this.terms.map(async (t) => {
      if (t instanceof RollFFG) {
        hasInner = true;
        await t.evaluate({ minimize, maximize });
        this._dice = this._dice.concat(t.dice);
        return `${t.total}`;
      }
      return t;
    }));
     */


    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    // TODO: add switch back
    switch (partId) {
      case 'rules':
      case 'another_tab':
        context.tab = context.tabs[partId];
        break;
      default:
    }
    context.tab = context.tabs[partId];
    return context;
  }

  async getBackgrounds() {
     //const sources = game.settings.get("starwarsffg", "specializationCompendiums").split(",");
    const sources = ["world.oggdudebackgrounds"];
    const cultures = [];
    const hooks = [];
    const forceAttitudes = [];

    for (const source of sources) {
      const pack = game.packs.get(source);
      if (!pack) {
        continue;
      }
      const items = await pack.getDocuments();
      for (const item of items) {
        if (item.system.type === "culture") {
          cultures.push(item);
        } else if (item.system.type === "hook") {
          hooks.push(item);
        } else if (item.system.type === "attitude") {
          forceAttitudes.push(item);
        }
      }
    }

    return {
      cultures: cultures,
      hooks: hooks,
      forceAttitudes: forceAttitudes,
    }
  }

  async getAvailableMoralities(rules) {
    const sources = ["world.oggdudeobligations"];
    const obligations = [];
    const duties = [];
    const moralities = [];

    for (const source of sources) {
      const pack = game.packs.get(source);
      if (!pack) {
        continue;
      }
      const items = await pack.getDocuments();
      for (const item of items) {
        if (item.system.type === "obligation") {
          obligations.push(item);
        } else if (item.system.type === "duty") {
          duties.push(item);
        } else if (item.system.type === "morality") {
          moralities.push(item);
        }
      }
    }

    return {
      obligations: obligations,
      duties: duties,
      moralities: moralities,
    }
  }

  /**
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
  */
  static selectRules(event, target) {
    // <a data-action="myAction">Using a link for inline text</a> triggers this function
    const choice = $(target).find(":checked")[0].value;
    console.log(`selected ${choice}`)
    this.data.rules = choice;
    this.render(true);
  }

  /**
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
  */
  static selectStartingBonus(event, target) {
    console.log(event)
    console.log(target)
    const choice = $(target).find(":checked")[0].value;
    console.log(`selected starting bonus ${choice}`)
    //this.data.rules = choice;
    //this.render(true);
  }

  /**
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
  */
  async selectCulture(itemUuid, itemNametarget) {
    const selectedItem = await fromUuid(itemUuid);
    if (!selectedItem) {
      ui.notifications.warn(`Unable to find culture ${itemNametarget}!`);
      return;
    }
    $("#cultured_esc").text(selectedItem.system.description);
  }

  /**
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
  */
  async selectHook(itemUuid, itemNametarget) {
    const selectedItem = await fromUuid(itemUuid);
    if (!selectedItem) {
      ui.notifications.warn(`Unable to find hook ${itemNametarget}!`);
      return;
    }
    $("#hook_desc").text(selectedItem.system.description);
  }

  /**
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
  */
  async selectForceAttitude(itemUuid, itemNametarget) {
    const selectedItem = await fromUuid(itemUuid);
    if (!selectedItem) {
      ui.notifications.warn(`Unable to find force attitude ${itemNametarget}!`);
      return;
    }
    $("#force_attitude_desc").text(selectedItem.system.description);
  }

  /**
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
  */
  async selectObligation(itemUuid, itemNametarget) {
    // TODO: if the obligation is a morality, we need to use strength/weakness instead of magnitude
    const selectedItem = await fromUuid(itemUuid);
    if (!selectedItem) {
      ui.notifications.warn(`Unable to find obligation ${itemNametarget}!`);
      return;
    }
    $("#obligation_choice_desc").text(selectedItem.system.description);
  }
}
