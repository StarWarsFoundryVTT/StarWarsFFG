import ActorHelpers, {xpLogEarn, xpLogSpend} from "./actor-helpers.js";
import DiceHelpers from "./dice-helpers.js";
import {sortDataBy, addIfNotExist} from "../actors/actor-sheet-ffg.js";

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
    xp_spend: {
      template: 'systems/starwarsffg/templates/wizards/char_creator/tabs/xp_spend.html'
    },
    motivation: {
      template: 'systems/starwarsffg/templates/wizards/char_creator/tabs/motivation.html'
    },
    gear: {
      template: 'systems/starwarsffg/templates/wizards/char_creator/tabs/gear.html'
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
        {
          id: "xp_spend",
          label: "xp_spend"
        },
        {
          id: "gear",
          label: "gear"
        },
        {
          id: "motivation",
          label: "motivation"
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
      width: 950,
      height: 800,
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
        motivations: [],
      },
      available: {
        specializations: [],
      },
      purchases: {
        xp: {
          characteristics: [],
          skills: [],
          talents: [],
          specializations: [],
          forcePowers: [],
        },
        credits: [],
      },
    };
    this.builtin = {
      rules: {
        fad: "Force and Destiny",
        aor: "Age of Rebellion",
        eote: "Edge of the Empire",
      },
    };

    // TODO: remove this block
    this.data.selected.species = game.items.getName("species");
    this.data.purchases.xp.specializations.push({
      item: game.items.getName("Advisor"),
      cost: 20,
    });
    this.data.purchases.xp.forcePowers.push({
      item: game.items.getName("Alter"),
      cost: 10,
    });
    this.data.grants.bonus.credits = 2500;
    this.data.purchases.credits.push({
      item: game.items.getName("weapon"),
      cost: 300,
    });
    this.showCharacterStatus() // TODO: remove
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
    if (this.data.selected.rules === "fad") {
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
    }

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
    const speciesTable = new DataTable(
      "#species",
    );
    $(".species-spend").on("click", async (event) => {
      await this.handleSpeciesSelect(event);
    });

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

    $(".starwarsffg.wizard").find(".skill").each(async (_, elem) => {
      const skillData = foundry.utils.deepClone(
        this.tempActor.system
      );
      await DiceHelpers.addSkillDicePool({data: skillData}, elem);
    });

    // handled spending XP
    $('[data-action="characteristic-control"]').on("click", async (event) => {
      await this.handleCharacteristicModify(event);
    });
    $('[data-action="skill-control"]').on("click", async (event) => {
      await this.handleSkillModify(event);
    });
    $(".skills-container").on("click", function() {
      $(".skills-summary").toggle('slow');
    });
    $(".specialization-container").on("click", function(event) {
      $(event.target).find(".specialization-summary").toggle('slow');
    });
    $(".specialization-remove").on("click", async (event) => {
      await this.handleRemoveSpecialization(event);
    });
    $(".purchase-specialization").on("click", async (event) => {
      await this.handleSpecializationPurchase(event);
    });
    $(".specialization-talent-purchase").on("change", async (event) => {
      await this.handleSpecializationTalentPurchase(event);
    });
    // force powers
    $(".purchase-forcePower").on("click", async (event) => {
      await this.handleForcePowerPurchase(event);
    });
    $(".forcePower-container").on("click", function(event) {
      $(event.target).find(".forcePower-summary").toggle('slow');
    });
    $(".forcePower-remove").on("click", async (event) => {
      await this.handleRemoveForcePower(event);
    });
    $(".forcePower-talent-purchase").on("change", async (event) => {
      await this.handleForcePowerTalentPurchase(event);
    });

    // credit spending
    const gearTable = new DataTable(
      "#buy_gear",
      {
        columnDefs: [{
          visible: false,
          targets: 0,
        }],
        layout: {
          topStart: {
            buttons: [
              {
                text: 'Weapons',
                action: async (e, dt, node, config) => {
                  dt.column(3).visible(true);
                  dt.column(4).visible(true);
                  dt.column(5).visible(true);
                  dt.column(6).visible(true);
                  dt.column(7).visible(true);
                  dt.column(8).visible(true);
                  dt.column(9).visible(true);
                  dt.column(10).visible(true);
                  dt.column(11).visible(true);
                  dt.column(12).visible(false);
                  dt.column(13).visible(false);
                  dt.column(14).visible(false);
                  dt.column(0).search('weapon').draw(false);
                  await this.activateShopListeners();
                },
                className: 'weapon',
              },
              {
                text: 'Armor',
                action: async (e, dt, node, config) => {
                  dt.column(3).visible(true);
                  dt.column(4).visible(false);
                  dt.column(5).visible(false);
                  dt.column(6).visible(true);
                  dt.column(7).visible(true);
                  dt.column(8).visible(true);
                  dt.column(9).visible(false);
                  dt.column(10).visible(false);
                  dt.column(11).visible(true);
                  dt.column(12).visible(true);
                  dt.column(13).visible(true);
                  dt.column(14).visible(false);
                  dt.column(0).search('armour').draw(false);
                  await this.activateShopListeners();
                },
                className: 'armor',
              },
              {
                text: 'Gear',
                action: async (e, dt, node, config) => {
                  dt.column(3).visible(true);
                  dt.column(4).visible(false);
                  dt.column(5).visible(false);
                  dt.column(6).visible(true);
                  dt.column(7).visible(true);
                  dt.column(8).visible(false);
                  dt.column(9).visible(false);
                  dt.column(10).visible(false);
                  dt.column(11).visible(true);
                  dt.column(12).visible(false);
                  dt.column(13).visible(false);
                  dt.column(14).visible(false);
                  dt.column(0).search('gear').draw(false);
                  await this.activateShopListeners();
                },
                className: 'gear',
              },
              {
                text: 'Attachment',
                action: async (e, dt, node, config) => {
                  dt.column(3).visible(true);
                  dt.column(4).visible(false);
                  dt.column(5).visible(false);
                  dt.column(6).visible(true);
                  dt.column(7).visible(false);
                  dt.column(8).visible(true);
                  dt.column(9).visible(false);
                  dt.column(10).visible(false);
                  dt.column(11).visible(true);
                  dt.column(12).visible(false);
                  dt.column(13).visible(false);
                  dt.column(14).visible(true);
                  dt.column(0).search('itemattachment').draw(false);
                  await this.activateShopListeners();
                },
                className: 'attachment',
              },
              {
                text: 'Mod',
                action: async (e, dt, node, config) => {
                  dt.column(3).visible(false);
                  dt.column(4).visible(false);
                  dt.column(5).visible(false);
                  dt.column(6).visible(false);
                  dt.column(7).visible(false);
                  dt.column(8).visible(false);
                  dt.column(9).visible(false);
                  dt.column(10).visible(false);
                  dt.column(11).visible(false);
                  dt.column(12).visible(false);
                  dt.column(13).visible(false);
                  dt.column(14).visible(true);
                  dt.column(0).search('itemmod').draw(false);
                  await this.activateShopListeners();
                },
                className: 'mod',
              },
            ],
          }
        }
      }
    );
    gearTable.buttons('.weapon').trigger();

    // motivations
    const purchasedMotivationTable = new DataTable(
      "#selected_motivations",
    );
    const availableMotivationTable = new DataTable(
      "#motivations",
    );
    $(".motivation-spend").on("click", async (event) => {
      await this.handleMotivationPurchase(event);
    });
    $(".motivation-refund").on("click", async (event) => {
      await this.handleMotivationRefund(event);
    });

    /**
     * new DataTable('#myTable', {
     *     columnDefs: [{ visible: false, targets: 0 }]
     * });
     *
     */

    console.log(this.data)
  }

  async activateShopListeners() {
    $(".credit-spend").on("click", async (event) => {
      await this.handleCreditPurchase(event);
    });
    $(".credit-refund").on("click", async (event) => {
      await this.handleCreditRefund(event);
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

    // TODO: include items in the world instead of just compendiums
    context.availableBackgrounds = await this.getBackgrounds();
    context.startingBonusesRadio = CONFIG.FFG.characterCreator.startingBonusesRadio[this.data.selected.rules];
    const obligations = await this.getAvailableMoralities(this.data.selected.rules);
    context.availableMoralities = obligations.moralities;
    context.availableObligations = obligations.obligations;
    context.availableDuties = obligations.duties;
    context.availableSpecies = await this.getAvailableSpecies();
    context.availableCareers = await this.getAvailableCareers();
    context.filteredSpecializations = await this.getFilteredSpecializations();
    context.availableMotivations = await this.getAvailableMotivations();
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
    context.tempActor = this.tempActor;
    if (this.tempActor) {
      const skillData = foundry.utils.deepClone(
        this.tempActor.system
      );
      context.skillsList = this.tempActor.sheet._createSkillColumns({data: skillData});

    }
    const xp = this.calcXp();
    context.totalXp = xp.total;
    context.availableXp = xp.available;

    // items for the shop
    context.items = await this.getItems();

    const credits = this.calcCredits();
    context.totalCredits = credits.total;
    context.availableCredits = credits.available;
    context.FFGCONFIG = CONFIG.FFG;

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
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

  async getItems() {
     //const sources = game.settings.get("starwarsffg", "specializationCompendiums").split(",");
    const sources = [
      "world.oggdudeweapons",
      "world.oggdudearmor",
      "world.oggdudegear",
      "world.oggdudearmorattachments", "world.oggdudegenericattachments", "world.oggdudeweaponattachments",
      "world.oggdudearmormods", "world.oggdudegenericmods", "world.oggdudeweaponmods"
    ];
    const preparedItems = [];

    for (const source of sources) {
      const pack = game.packs.get(source);
      if (!pack) {
        continue;
      }
      const items = await pack.getDocuments();
      for (const item of items) {
        preparedItems.push(item);
      }
    }

    return preparedItems;
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

  async getAvailableMotivations() {
    const sources = ["world.oggdudemotivations"];
    const motivations = [];

    for (const source of sources) {
      const pack = game.packs.get(source);
      if (!pack) {
        continue;
      }
      const items = await pack.getDocuments();
      for (const item of items) {
        motivations.push(item);
      }
    }

    return motivations;
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

  async handleSpeciesSelect(event) {
    const target = $(event.currentTarget);
    const selectedSpecies = await fromUuid(target.data("source"));
    if (!selectedSpecies) {
      ui.notifications.warn(`Unable to find species ${itemNameTarget}!`);
      return;
    }
    this.data.selected.species = selectedSpecies;
    await this.showCharacterStatus();
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

  async selectMotivation(selections) {
    console.log(selections)
    if (selections.length === 0) {
      $("#motivation_choice_desc").text("");
    } else {
      const newestSelection = selections[selections.length - 1];
      const selectedItem = await fromUuid(newestSelection.value);
      if (!selectedItem) {
        ui.notifications.warn(`Unable to find motivation ${itemNametarget}!`);
        return;
      }
      $("#motivation_choice_desc").text(selectedItem.system.description);
      this.data.selected.motivations = selectedItem;
    }
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
    const totalXp = 100;
    const availableXp = 100;

    await tempActor.createEmbeddedDocuments("Item", items);
    if (this.data.selected.species?.uuid) {
      await tempActor.update({
        "system.experience": {
          total: totalXp,
          available: availableXp,
        }
      });
    }

    // apply purchases
    for (const characteristicPurchase of this.data.purchases.xp.characteristics) {
      const updateKey = `system.characteristics[${characteristicPurchase.key}].value`;
      await tempActor.update({updateKey: [tempActor.system.characteristics[characteristicPurchase.key].value++]})
    }
    for (const skillPurchase of this.data.purchases.xp.skills) {
      const updateKey = `system.skills[${skillPurchase.key}].rank`;
      await tempActor.update({updateKey: [tempActor.system.skills[skillPurchase.key].rank++]})
    }

    this.tempActor = tempActor;
    this.render();

    // TODO: add bonus stuff
  }

  async handleCharacteristicModify(event) {
    // TODO: handle brawn/willpower modifications, which should mpact wounds/strain/soak
    const target = $(event.currentTarget);
    const characteristic = target.data("target");
    const direction = target.data("direction");
    const curValue = target.data("value");
    let newValue;
    if (direction === "increase") {
      newValue = curValue + 1;
      this.data.purchases.xp.characteristics.push({
        key: characteristic,
        value: newValue,
        cost: newValue * 10,
      });
    } else {
      const purchaseIndex = this.data.purchases.xp.characteristics.findIndex(function(purchase) {
        return purchase.key === characteristic && purchase.value === curValue;
      });
      this.data.purchases.xp.characteristics.splice(purchaseIndex, 1);
    }
    // rebuild the actor to apply the changes
    await this.showCharacterStatus();
  }

  async handleSkillModify(event) {
    const target = $(event.currentTarget);
    const skill = target.data("target");
    const direction = target.data("direction");
    const curValue = target.data("value");
    let newValue;
    if (direction === "increase") {
      newValue = curValue + 1;
      let cost;
      if (this.tempActor.system.skills[skill].careerskill) {
        cost = newValue * 5;
      } else {
        cost = (newValue * 5) + 5;
      }
      this.data.purchases.xp.skills.push({
        key: skill,
        value: newValue,
        cost: cost,
      });
    } else {
      const purchaseIndex = this.data.purchases.xp.skills.findIndex(function(purchase) {
        return purchase.key === skill && purchase.value === curValue;
      });
      this.data.purchases.xp.skills.splice(purchaseIndex, 1);
    }
    // rebuild the actor to apply the changes
    await this.showCharacterStatus();
  }

  async handleSpecializationPurchase(event) {
    console.log(event)
    const availableXP = this.calcXp()['available'];
    const template = "systems/starwarsffg/templates/dialogs/ffg-confirm-purchase.html";
    const groups = [];
    // prepare the items list
    const inCareer = this.data.selected.career?.system?.specializations;
      if (!inCareer) {
        ui.notifications.warn("Could not locate any specializations in your career! Please define them first");
        return;
      }
      const inCareerNames = Object.values(inCareer).map(i => i.name);
      const sources = game.settings.get("starwarsffg", "specializationCompendiums").split(",");
      let outCareer = [];
      let universal = [];
      for (const source of sources) {
        const pack = game.packs.get(source);
        if (!pack) {
          continue;
        }
        const items = await pack.getDocuments();
        for (const item of items) {
          if (!inCareerNames.includes(item.name) && item.system.universal) {
            universal.push({
              name: item.name,
              id: item.id,
              source: item.uuid,
            });
          } else if (!inCareerNames.includes(item.name)) {
            outCareer.push({
              name: item.name,
              id: item.id,
              source: item.uuid,
            });
          }
        }
      }
      outCareer = sortDataBy(outCareer, "name");
      universal = sortDataBy(universal, "name");
      const baseCost = (this.data.purchases.xp.specializations.length + 1) * 10;
      const increasedCost = baseCost + 10;
      if (baseCost > availableXP) {
        ui.notifications.warn(game.i18n.localize("SWFFG.Actors.Sheets.Purchase.NotEnoughXP"));
        return;
      } else if (increasedCost > availableXP) {
        outCareer = [];
      }
      const itemType =  game.i18n.localize("TYPES.Item.specialization");
      groups.push("Universal");
      groups.push("In Career");
      groups.push("Out of Career");
      const content = await foundry.applications.handlebars.renderTemplate(template, { inCareer, outCareer, universal, baseCost, increasedCost, itemType: itemType, itemCategory: "specialization", groups: groups });
      // actually show the purchase menu
      await this.showPurchaseConfirmation("specializations", content)
  }

  async handleForcePowerPurchase(event) {
    const groups = [];
    const template = "systems/starwarsffg/templates/dialogs/ffg-confirm-purchase.html";
    const sources = game.settings.get("starwarsffg", "forcePowerCompendiums").split(",");
      let selectableItems = [];
      const worldItems = game.items.filter(i => i.type === "forcepower");
      for (const worldItem of worldItems) {
        selectableItems.push({
          name: worldItem.name,
          id: worldItem.id,
          source: worldItem.uuid,
          cost: worldItem.system.base_cost,
          requiredForceRating: parseInt(worldItem.system.required_force_rating),
        });
        addIfNotExist(groups, parseInt(worldItem.system.required_force_rating));
      }
      for (const source of sources) {
        const pack = game.packs.get(source);
        if (!pack) {
          continue;
        }
        const items = await pack.getDocuments();
        for (const item of items) {
          selectableItems.push({
            name: item.name,
            id: item.id,
            source: item.uuid,
            cost: item.system.base_cost,
            requiredForceRating: parseInt(item.system.required_force_rating),
          });
          addIfNotExist(groups, parseInt(item.system.required_force_rating));
        }
      }
      selectableItems = sortDataBy(selectableItems, "name");
      const itemType = game.i18n.localize("TYPES.Item.forcepower");
      groups.sort();
      const content = await foundry.applications.handlebars.renderTemplate(template, { selectableItems, itemType: itemType, itemCategory: "forcepower", groups: groups });
      // actually show the purchase menu
      await this.showPurchaseConfirmation("forcePowers", content)
  }

  async handleRemoveSpecialization(event) {
    const target = $(event.currentTarget);
    const specName = target.data("name");
    const talentPurchaseLength = this.data.purchases.xp.talents.length - 1;
    const specializationPurchaseLength = this.data.purchases.xp.specializations.length - 1;

    console.log(specName, talentPurchaseLength)

    for (let index = talentPurchaseLength; index >= 0; index--) {
      const talentPurchase = this.data.purchases.xp.talents[index];
      if (talentPurchase.specName === specName) {
        this.data.purchases.xp.talents.splice(index, 1);
      }
    }

    for (let index = specializationPurchaseLength; index >= 0; index--) {
      const specPurchase = this.data.purchases.xp.specializations[index];
      if (specPurchase.item.name === specName) {
        this.data.purchases.xp.specializations.splice(index, 1);
      }
    }

    // rebuild the actor to apply the changes
    await this.showCharacterStatus();
  }

  async handleRemoveForcePower(event) {
    const target = $(event.currentTarget);
    const specName = target.data("name");
    const talentPurchaseLength = this.data.purchases.xp.talents.length - 1;
    const forcePowerPurchaseLength = this.data.purchases.xp.forcePowers.length - 1;

    console.log(specName, talentPurchaseLength)

    for (let index = talentPurchaseLength; index >= 0; index--) {
      const talentPurchase = this.data.purchases.xp.talents[index];
      if (talentPurchase.specName === specName) {
        this.data.purchases.xp.talents.splice(index, 1);
      }
    }

    for (let index = forcePowerPurchaseLength; index >= 0; index--) {
      const forcePowerPurchase = this.data.purchases.xp.forcePowers[index];
      if (forcePowerPurchase.item.name === specName) {
        this.data.purchases.xp.forcePowers.splice(index, 1);
      }
    }

    // rebuild the actor to apply the changes
    await this.showCharacterStatus();
  }

  async handleForcePowerTalentPurchase(event) {
    const target = $(event.currentTarget);
    const upgrade = target.data("target");
    const forcePowerName = target.data("forcepower");
    const parentForcePower = this.data.purchases.xp.forcePowers.find(s => s.item.name === forcePowerName)?.item;
    if (!parentForcePower) {
      ui.notifications.warn(`Unable to find force power ${forcePowerName} with upgrade ${upgrade}! bailing`);
      return;
    }
    const wasLearned = parentForcePower.system.upgrades[upgrade]?.islearned || false
    const cost = target.data("cost");

    parentForcePower.system.upgrades[upgrade].islearned = !wasLearned;

    console.log(target, upgrade, wasLearned, cost)

    if (!wasLearned) {
      this.data.purchases.xp.talents.push({
        specName: parentForcePower.name,
        key: upgrade,
        cost: cost,
      });
    } else {
      const purchaseIndex = this.data.purchases.xp.talents.findIndex(function(purchase) {
        return purchase.key === upgrade && purchase.specName === parentForcePower;
      });
      this.data.purchases.xp.talents.splice(purchaseIndex, 1);
    }

    // rebuild the actor to apply the changes
    await this.showCharacterStatus();
  }

  async handleSpecializationTalentPurchase(event) {
    const target = $(event.currentTarget);
    const talent = target.data("target");
    const specializationName = target.data("specialization");
    const cost = target.data("cost");
    let wasLearned;
    if (specializationName === this.data.selected.specialization?.name) {
      wasLearned = this.data.selected.specialization?.system?.talents[talent]?.islearned || false;
      this.data.selected.specialization.system.talents[talent].islearned = !wasLearned;
    } else {
      const parentSpec = this.data.purchases.xp.specializations.find(s => s.item.name === specializationName)?.item;
      if (!parentSpec) {
        ui.notifications.warn(`Unable to find specialization ${specializationName} talent ${talent} is within! bailing`);
        return;
      }
      wasLearned = parentSpec.system.talents[talent]?.islearned || false;
      parentSpec.system.talents[talent].islearned = !wasLearned;
    }

    if (!wasLearned) {
      this.data.purchases.xp.talents.push({
        specName: specializationName,
        key: talent,
        cost: cost,
      });
    } else {
      const purchaseIndex = this.data.purchases.xp.talents.findIndex(function(purchase) {
        return purchase.key === talent && purchase.specName === specializationName;
      });
      this.data.purchases.xp.talents.splice(purchaseIndex, 1);
    }

    // rebuild the actor to apply the changes
    await this.showCharacterStatus();
  }

  async showPurchaseConfirmation(itemType, content) {
    const dialog = new Dialog(
      {
        title: game.i18n.format("SWFFG.Actors.Sheets.Purchase.DialogTitle", {itemType: itemType}),
        content: content,
        buttons: {
          done: {
            icon: '<i class="fa-regular fa-circle-up"></i>',
            label: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.ConfirmPurchase"),
            callback: async (purchaseWindow) => {
              console.log(purchaseWindow)
              const cost = $("#ffgPurchase option:selected", purchaseWindow).data("cost");
              const selectedUuid = $("#ffgPurchase option:selected", purchaseWindow).data("source");

              console.log(cost, selectedUuid)

              const selectedItem = await fromUuid(selectedUuid);
              if (!selectedItem) {
                ui.notifications.warn("Unable to locate purchased specialization, sorry!");
                return;
              }
              this.data.purchases.xp[itemType].push({
                item: selectedItem,
                cost: cost,
              });
              // rebuild the actor to apply the changes
              await this.showCharacterStatus();
            },
          },
          cancel: {
            icon: '<i class="fas fa-cancel"></i>',
            label: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.CancelPurchase"),
          },
        },
      },
      {
        classes: ["dialog", "starwarsffg"],
      }
    ).render(true);
  }

  calcXp() {
    let total = (this.data.selected.species?.system?.startingXP || 0) + this.data.grants.bonus.xp;
    let available = total;
    for (const purchase of this.data.purchases.xp.characteristics) {
      available-= purchase.cost;
    }
    for (const purchase of this.data.purchases.xp.skills) {
      available-= purchase.cost;
    }
    for (const purchase of this.data.purchases.xp.talents) {
      available-= purchase.cost;
    }
    for (const purchase of this.data.purchases.xp.specializations) {
      available-= purchase.cost;
    }
    for (const purchase of this.data.purchases.xp.forcePowers) {
      available-= purchase.cost;
    }

    return {
      total: total,
      available: available,
    }
  }

  async handleCreditPurchase(event) {
    const target = $(event.currentTarget);
    const itemUuid = target.data("source");
    console.log("click")
    const purchasedItem = await fromUuid(itemUuid);
    if (!purchasedItem) {
      return ui.notifications.warn("Unable to locate purchased item, sorry!");
    }
    this.data.purchases.credits.push({
      item: purchasedItem,
      cost: purchasedItem.system.price.value,
    });
    // rebuild the actor to apply the changes
    await this.showCharacterStatus();
  }

  async handleCreditRefund(event) {
    const target = $(event.currentTarget);
    const itemName = target.data("name");
    const purchasedItemLength = this.data.purchases.credits.length - 1;

    for (let index = purchasedItemLength; index >= 0; --index) {
      const itemPurchase = this.data.purchases.credits[index];
      if (itemPurchase.item.name === itemName) {
        this.data.purchases.credits.splice(index, 1);
      }
    }

    // rebuild the actor to apply the changes
    await this.showCharacterStatus();
  }

  calcCredits() {
    const total = this.data.grants.bonus.credits;
    let available = total;

    for (const purchase of this.data.purchases.credits) {
      available -= purchase.cost;
    }

    return {
      total: total,
      available: available,
    }
  }

  async handleMotivationPurchase(event) {
    const target = $(event.currentTarget);
    const itemUuid = target.data("source");
    console.log("click")
    const purchasedItem = await fromUuid(itemUuid);
    if (!purchasedItem) {
      return ui.notifications.warn("Unable to locate motivation item, sorry!");
    }
    this.data.selected.motivations.push({
      item: purchasedItem,
    });
    // rebuild the actor to apply the changes
    await this.showCharacterStatus();
  }

  async handleMotivationRefund(event) {
    const target = $(event.currentTarget);
    const itemName = target.data("name");
    const purchasedItemLength = this.data.selected.motivations.length - 1;

    for (let index = purchasedItemLength; index >= 0; --index) {
      const itemPurchase = this.data.selected.motivations[index];
      if (itemPurchase.item.name === itemName) {
        this.data.selected.motivations.splice(index, 1);
      }
    }

    // rebuild the actor to apply the changes
    await this.showCharacterStatus();
  }
}
