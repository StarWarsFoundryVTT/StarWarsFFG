import {xpLogEarn} from "./actor-helpers.js";

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
      template: 'systems/starwarsffg/templates/wizards/char_creator/tabs/species.html'
    },
    career: {
      template: 'systems/starwarsffg/templates/wizards/char_creator/tabs/career.html'
    },
    specialization: {
      template: 'systems/starwarsffg/templates/wizards/char_creator/tabs/specialization.html'
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
        {
          id: "species",
          label: "species"
        },
        {
          id: "career",
          label: "career"
        },
        {
          id: "specialization",
          label: "specialization"
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
      grants: {
        gm: {},
        bonus: {
          xp: 0,
          credits: 0,
          duty: 0,
          obligation: 0,
          morality: 0,
        },
        species: {},
        career: {},
        specialization: {},
      },
      selected: {
        background: {
          culture: null,
          hook: null,
          forceAttitude: null,
        },
        startingBonus: null,
        obligation: null,
        species: null,
        career: null,
        specialization: null,
        rules: 'fad',
      },
      available: {
        specializations: [],
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

  async _postRender(context, options) {
    await super._postRender(context, options);
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    console.log("render")

    // backgrounds
    const cultureSelector = new SlimSelect({
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
    cultureSelector.setSelected(this.data.selected.background.culture?.uuid, false);
    const hookSelector = new SlimSelect({
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
    hookSelector.setSelected(this.data.selected.background.hook?.uuid, false);
    const forceAttitudeSelector = new SlimSelect({
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
    forceAttitudeSelector.setSelected(this.data.selected.background.forceAttitude?.uuid, false);

    // obligations
    const obligationSelector = new SlimSelect({
      select: '#obligation_choice',
      cssClasses: {
        option: "starwarsffg" // TODO: select a real class here
      },
      events: {
        afterChange: async (selections) => {
          await this.selectObligation(selections);
        }
      }
    });
    obligationSelector.setSelected(this.data.selected.background.obligation?.uuid, false);

    // species
    const speciesSelector = new SlimSelect({
      select: '#species_choice',
      cssClasses: {
        option: "starwarsffg" // TODO: select a real class here
      },
      events: {
        afterChange: async (selection) => {
          await this.selectSpecies(selection[0].value, selection[0].text);
        }
      }
    });
    speciesSelector.setSelected(this.data.selected.species?.uuid, false);

    // careers
    const careerSelector = new SlimSelect({
      select: '#career_choice',
      cssClasses: {
        option: "starwarsffg" // TODO: select a real class here
      },
      events: {
        afterChange: async (selection) => {
          await this.selectCareer(selection[0].value, selection[0].text);
        }
      }
    });
    careerSelector.setSelected(this.data.selected.career?.uuid, false);

    // specializations
    const specializationSelector = new SlimSelect({
      select: '#specialization_choice',
      cssClasses: {
        option: "starwarsffg" // TODO: select a real class here
      },
      events: {
        afterChange: async (selection) => {
          await this.selectSpecialization(selection[0].value, selection[0].text);
        }
      }
    });
    specializationSelector.setSelected(this.data.selected.specialization?.uuid, false);
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

    // TODO: include items in the world instead of just compendiums
    context.availableBackgrounds = await this.getBackgrounds();
    context.startingBonusesRadio = CONFIG.FFG.characterCreator.startingBonusesRadio[this.data.selected.rules];
    const obligations = await this.getAvailableMoralities(this.data.selected.rules);
    context.availableMoralities = obligations.moralities;
    context.availableObligations = obligations.obligations;
    context.availableDuties = obligations.duties;
    context.availableSpecies = await this.getAvailableSpecies();
    context.availableCareers = await this.getAvailableCareers();
    context.filteredSpecializations = await this.getFilteredSpecializations(); // TODO: add dynamic career
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

  async getAvailableSpecies() {
    const sources = ["world.oggdudespecies"];
    const species = [];

    for (const source of sources) {
      const pack = game.packs.get(source);
      if (!pack) {
        continue;
      }
      const items = await pack.getDocuments();
      for (const item of items) {
        species.push(item);
      }
    }

    return species;
  }

  async getAvailableCareers() {
    // TODO: we probably want to show available specializations in this window
    // and possibly even fold it into the same tab in the wizard
    const sources = ["world.oggdudecareers"];
    const careers = [];

    for (const source of sources) {
      const pack = game.packs.get(source);
      if (!pack) {
        continue;
      }
      const items = await pack.getDocuments();
      for (const item of items) {
        careers.push(item);
      }
    }

    return careers;
  }

  async getFilteredSpecializations(career) {
    return this.data.available.specializations;
  }

  /**
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
  */
  static selectRules(event, target) {
    // <a data-action="myAction">Using a link for inline text</a> triggers this function
    const choice = $(target).find(":checked")[0].value;
    console.log(`selected ${choice}`)
    this.data.selected.rules = choice;
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
    const ruleToBonusMap = {
      fad: 'conflict',
      aor: 'duty',
      eote: 'obligation',
    };
    this.data.grants.bonus.xp = 0;
    this.data.grants.bonus.duty = 0;
    this.data.grants.bonus.obligation = 0;
    this.data.grants.bonus.conflict = 0;
    this.data.grants.bonus.credits = 0;

    if (this.data.selected.rules === 'fad') {
      if (choice === '10xp') {
        this.data.grants.bonus.xp = 10;
      } else if (choice === '2k_credits') {
        this.data.grants.bonus.credits = 2500;
      } else if (choice === '5xp' ) {
        this.data.grants.bonus.xp = 5;
        this.data.grants.bonus.credits = 1000;
      } else if (choice === '21_plus_morality' ) {
        this.data.grants.bonus.morality = 21;
      } else if (choice === '21_minus_morality' ) {
        this.data.grants.bonus.morality = -21;
      }
    } else {
      if (choice === '5xp') {
        this.data.grants.bonus.xp = 5;
        this.data.grants.bonus[ruleToBonusMap[this.data.grants.rules]] = 5;
      } else if (choice === '10xp') {
        this.data.grants.bonus.xp = 10;
        this.data.grants.bonus[ruleToBonusMap[this.data.grants.rules]] = 10;
      } else if (choice === '1k_credits') {
        this.data.grants.bonus.credits = 1000;
        this.data.grants.bonus[ruleToBonusMap[this.data.grants.rules]] = 5;
      } else if (choice === '2k_credits') {
        this.data.grants.bonus.credits = 2500;
        this.data.grants.bonus[ruleToBonusMap[this.data.grants.rules]] = 10;
      }
    }
    this.data.selected.startingBonus = choice;
    this.render(true);
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
    this.data.selected.background.culture = selectedItem;
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
    this.data.selected.background.hook = selectedItem;
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
    this.data.selected.background.forceAttitude = selectedItem;
  }

  /**
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
  */
  async selectObligation(selections) {
    console.log(selections)
    if (selections.length === 0) {
      $("#obligation_choice_desc").text("");
    } else {
      const newestSelection = selections[selections.length - 1];
      const selectedItem = await fromUuid(newestSelection.value);
      if (!selectedItem) {
        ui.notifications.warn(`Unable to find obligation ${itemNametarget}!`);
        return;
      }
      $("#obligation_choice_desc").text(selectedItem.system.description);
      this.data.selected.obligation = selectedItem;
    }
  }

  /**
   * @param {string} itemUuid - The originating click event
   * @param {HTMLElement} itemNameTarget - the capturing HTML element which defined a [data-action]
  */
  async selectSpecies(itemUuid, itemNameTarget) {
    const selectedSpecies = await fromUuid(itemUuid);
    if (!selectedSpecies) {
      ui.notifications.warn(`Unable to find species ${itemNameTarget}!`);
      return;
    }
    $("#species_choice_desc").text(selectedSpecies.system.description);
    $("#species_choice_img").attr("src", selectedSpecies.img);
    this.data.selected.species = selectedSpecies;
  }

  /**
   * @param {string} itemUuid - The originating click event
   * @param {HTMLElement} itemNameTarget - the capturing HTML element which defined a [data-action]
  */
  async selectCareer(itemUuid, itemNameTarget) {
    const selectedCareer = await fromUuid(itemUuid);
    if (!selectedCareer) {
      ui.notifications.warn(`Unable to find career ${itemNameTarget}!`);
      return;
    }

    $("#career_choice_desc").text(selectedCareer.system.description);
    this.data.selected.career = selectedCareer;
    //$("#career_choice_img").attr("src", selectedCareer.img); // TODO: CSS to a normal size

    // update specialization information
    this.data.available.specializations = [];
    for (const specData of Object.values(selectedCareer.system.specializations)) {
      const specItem = await fromUuid(specData.source);
      if (specItem) {
        this.data.available.specializations.push(specItem);
      } else {
        CONFIG.logger.debug(`Unable to find specialization with UUID ${specData.source}`);
      }
    }
    // TODO: this is currently cleared by the render which occurs
    await this.render(true);
  }

  /**
   * @param {string} itemUuid - The originating click event
   * @param {HTMLElement} itemNameTarget - the capturing HTML element which defined a [data-action]
  */
  async selectSpecialization(itemUuid, itemNameTarget) {
    const selectedSpecialization = await fromUuid(itemUuid);
    if (!selectedSpecialization) {
      ui.notifications.warn(`Unable to find career ${itemNameTarget}!`);
      return;
    }
    $("#specialization_choice_desc").text(selectedSpecialization.system.description);
    //$("#career_choice_img").attr("src", selectedSpecialization.img); // TODO: CSS to a normal size
    this.data.selected.specialization = selectedSpecialization;
    await this.showCharacterStatus();
  }

  async showCharacterStatus() {
    // temporary: delete previous copies of the actor
    const existingActor = game.actors.getName("temp actor");
    if (existingActor) {
      await existingActor.delete();
    }

    // temporary: create a new actor to add stuff to
    const tempActor = await Actor.create(
      {
        name: "temp actor",
        type: "character",
        displaySheet: false,
      },
    );

    // add items to the actor
    const items = [];
    for (const key of Object.keys(this.data.selected)) {
      if (key !== 'background' && this.data.selected[key]?.uuid) {
        items.push(this.data.selected[key]);
      } else if (key === 'background') {
        for (const backKey of Object.keys(this.data.selected.background)) {
          if (this.data.selected.background[backKey]?.uuid) {
            items.push(this.data.selected.background[backKey]);
          }
        }
      }
    }
    console.log(items)
    const total = 100;
    const available = 100;

    await tempActor.createEmbeddedDocuments("Item", items);
    if (this.data.selected.species?.uuid) {
      await tempActor.update({
        "system.experience": {
          total: total,
          available: available,
        }
      });
      // XP log from species is on the actor sheet drop handler, so we need to manually fire it
      await xpLogEarn(
        tempActor,
        total,
        total,
        total,
        game.i18n.format("SWFFG.GrantXPSpecies", {species: this.data.selected.species.name})
      );
    }

    // TODO: add bonus stuff
  }
}
