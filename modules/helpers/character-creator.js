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
      template: 'systems/starwarsffg/templates/wizards/char_creator/tabs/review.html'
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
        {
          id: "review",
          label: "review"
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
      // items granted - either by the GM or by the starting bonus, etc
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
      // choices made by the user
      selected: {
        background: {
          culture: null,
          hook: null,
          forceAttitude: null,
        },
        startingBonus: null,
        obligations: [],
        species: null,
        career: null,
        careerCareerSkillRanks: [],
        specialization: null,
        specializationCareerSkillRanks: [],
        rules: 'fad',
        motivations: [],
      },
      // filtered list of specializations based on the selected career
      available: {
        specializations: [],
      },
      // things purchased by the user, with XP or credits
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
      initial: {
        duty: game.settings.get("starwarsffg", "defaultDuty"),             // decreased with starting bonuses
        obligation: game.settings.get("starwarsffg", "defaultObligation"), // increased with starting bonuses
        morality: game.settings.get("starwarsffg", "defaultMorality"),     // increased or decreased with starting bonuses
      },
    };
    this.builtin = {
      rules: {
        fad: "Force and Destiny",
        aor: "Age of Rebellion",
        eote: "Edge of the Empire",
      },
    };

    this.compendiumData = {};
  }

  /** @override */
  async _onRender(context, options) {
    /**
     * Used to activateListeners on ApplicationV2
     */
    await super._onRender(context, options);
    CONFIG.logger.debug("Rendering Character Creator");

    // backgrounds
    const cultureSelector = new SlimSelect({
      select: '#culture',
      cssClasses: {
        option: "starwarsffg"
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
        option: "starwarsffg"
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
          option: "starwarsffg"
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

    // starting bonuses
    const startingBonusSelector = new SlimSelect({
        select: '#startingBonus',
        cssClasses: {
          option: "starwarsffg"
        },
        events: {
          afterChange: async (newVal) => {
            // could be >1 but we only allow one here
            this.selectStartingBonus(newVal[0].value);
          }
        }
      });
      startingBonusSelector.setSelected(this.data.selected.startingBonus, false);

    // obligations
    const obligationsTable = new DataTable(
      "#obligations",
    );
    obligationsTable.on("draw", () => {
      $(".obligation-spend").off("click").on("click", async (event) => {
        await this.handleObligationSelect(event);
      });
    });
    $(".obligation-spend").on("click", async (event) => {
      await this.handleObligationSelect(event);
    });
    $(".obligation-control").on("click", async (event) => {
      await this.handleObligationEdit(event);
    });

    // species
    const speciesTable = new DataTable(
      "#species",
    );
    speciesTable.on("draw", () => {
      $(".species-spend").off("click").on("click", async (event) => {
        await this.handleSpeciesSelect(event);
      });
    });
    $(".species-spend").on("click", async (event) => {
      await this.handleSpeciesSelect(event);
    });

    // careers
    const careersTable = new DataTable(
      "#careers",
    );
    careersTable.on("draw", () => {
      $(".career-spend").off("click").on("click", async (event) => {
        await this.handleCareerSelect(event);
      });
    });
    $(".career-spend").on("click", async (event) => {
      await this.handleCareerSelect(event);
    });
    $(".career_tab-container").on("click", function(event) {
      $(event.target).find(".career-selection").toggle('slow');
      $(event.target).find(".career_skill_rank_select-selection").toggle('slow');
      $(event.target).find(".specialization-selection").toggle('slow');
      $(event.target).find(".specialization_skill_rank_select-selection").toggle('slow');
    });
    $(".career-select-container").click();

    // specializations
    const specializationsTable = new DataTable(
      "#specializations",
    );
    $(".specialization-spend").on("click", async (event) => {
      await this.handleSpecializationSelect(event);
    });

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
    gearTable.on("draw", async () => {
      await this.activateShopListeners();
    });
    gearTable.buttons('.weapon').trigger();

    // motivations
    const purchasedMotivationTable = new DataTable(
      "#selected_motivations",
    );
    const availableMotivationTable = new DataTable(
      "#motivations",
    );
    availableMotivationTable.on("draw", async () => {
      $(".motivation-spend").off("click").on("click", async (event) => {
        await this.handleMotivationPurchase(event);
      });
    });
    $(".motivation-spend").on("click", async (event) => {
      await this.handleMotivationPurchase(event);
    });
    $(".motivation-refund").on("click", async (event) => {
      await this.handleMotivationRefund(event);
    });

    // create the actor!
    $(".create-actor").on("click", async (event) => {
      await this.createActor(event);
    });

    CONFIG.logger.debug(`Current state: ${JSON.stringify(this.data)}`);
  }

  /**
   * Activates credit listeners
   * Done here since they're called repeatedly within the various filtered views in the datatable
   * @returns {Promise<void>}
   */
  async activateShopListeners() {
    $(".credit-spend").off("click").on("click", async (event) => {
      await this.handleCreditPurchase(event);
    });
    $(".credit-refund").off("click").on("click", async (event) => {
      await this.handleCreditRefund(event);
    });
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

    if (Object.keys(this.compendiumData).length === 0) {
      this.compendiumData['availableBackgrounds'] = await this.getBackgrounds();
      this.compendiumData['availableObligations'] = await this.getAvailableMoralities();
      this.compendiumData['availableSpecies'] = await this.getAvailableSpecies();
      this.compendiumData['availableCareers'] = await this.getAvailableCareers();
      this.compendiumData['availableMotivations'] = await this.getAvailableMotivations();
      this.compendiumData['items'] = await this.getItems();
    }

    context.availableBackgrounds = this.compendiumData['availableBackgrounds'];
    context.startingBonusesRadio = this.startingBonusForHTML();
    context.availableObligations = this.compendiumData['availableObligations'];
    context.availableSpecies = this.compendiumData['availableSpecies'];
    context.availableCareers = this.compendiumData['availableCareers'];
    context.filteredSpecializations = this.data.available.specializations;
    context.availableMotivations = this.compendiumData['availableMotivations'];
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
    context.items = this.compendiumData['items'];

    const credits = this.calcCredits();
    context.totalCredits = credits.total;
    context.availableCredits = credits.available;
    context.FFGCONFIG = CONFIG.FFG;

    const obligation = await this.calcObligation();
    context.startingObligation = obligation.starting;
    context.availableObligation = obligation.available;
    context.obligationKey = obligation.key;

    // include career / specialization career ranks
    let combinedPurchases = {};
    if (this.tempActor) {
      combinedPurchases = Object.fromEntries(
        Object.keys(this.tempActor.system.skills).map(key => [key.replace(" ", " "), 0])
      ); // default to 0 as 0 is not > undefined (for use in the template)
    }
    const careerPurchases = {};
    const specializationPurchases = {};
    for (const skillName of this.data.selected.careerCareerSkillRanks) {
      // add to career purchases
      if (!Object.keys(careerPurchases).includes(skillName)) {
        careerPurchases[skillName] = 0;
      }
      careerPurchases[skillName]++;
      combinedPurchases[skillName]++;
    }
    for (const skillName of this.data.selected.specializationCareerSkillRanks) {
      // add to career purchases
      if (!Object.keys(specializationPurchases).includes(skillName)) {
        specializationPurchases[skillName] = 0;
      }
      specializationPurchases[skillName]++;
      combinedPurchases[skillName]++;
    }
    context.careerSkillPurchases = careerPurchases;
    context.specializationSkillPurchases = specializationPurchases;
    context.combinedPurchases = combinedPurchases;

    const careerKeys = [];
    const specializationKeys = [];
    if (this.data.selected.career?.system?.careerSkills) {
      for (const skillName of Object.values(this.data.selected.career.system.careerSkills)) {
        careerKeys.push(skillName);
      }
    }
    if (this.data.selected.specialization?.system?.careerSkills) {
      for (const skillName of Object.values(this.data.selected.specialization.system.careerSkills)) {
        specializationKeys.push(skillName);
      }
    }
    context.careerKeys = careerKeys;
    context.specializationKeys = specializationKeys;

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    // TODO: is this needed? valuable?
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

  /**
   * Converts the config object into an object slimselect can use
   * @returns {*[]}
   */
  startingBonusForHTML() {
    const startingBonuses = CONFIG.FFG.characterCreator.startingBonusesRadio[this.data.selected.rules];
    const options = [];
    for (const value of Object.keys(startingBonuses)) {
      const label = startingBonuses[value];
      options.push({
        value: value,
        label: label,
      });
    }
    return options;
  }

  /**
   * Retrieve all items available for the player to buy
   * @returns {Promise<*[]>}
   */
  async getItems() {
    const sources = this.getSources("item");
    const preparedItems = [];
    const maxRarity = game.settings.get("starwarsffg", "maxRarity");
    const allowRestricted = game.settings.get("starwarsffg", "allowRestricted");

    for (const source of sources) {
      const pack = game.packs.get(source);
      if (!pack) {
        continue;
      }
      const items = await pack.getDocuments();
      for (const item of items) {
        if (item.system?.rarity?.value > maxRarity || (!allowRestricted && item.system?.rarity?.isrestricted)) {
          // do not include items disallowed by the GM
          continue;
        }
        item.pill = await foundry.applications.ux.TextEditor.enrichHTML(item?.link);
        preparedItems.push(item);
      }
    }

    return preparedItems;
  }

  /**
   * Retrieve all backgrounds available for the player to buy
   * @returns {Promise<{cultures: *[], hooks: *[], forceAttitudes: *[]}>}
   */
  async getBackgrounds() {
    const sources = this.getSources("background");
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
        item.pill = await foundry.applications.ux.TextEditor.enrichHTML(item?.link);
        if (item.system.type === "culture") {
          cultures.push(item);
        } else if (item.system.type === "hook") {
          hooks.push(item);
        } else if (item.system.type === "attitude") {
          forceAttitudes.push(item);
        }
      }
    }

    for (const item of game.items.filter(i => i.type === "background")) {
      item.pill = await foundry.applications.ux.TextEditor.enrichHTML(item?.link);
      if (item.system.type === "culture") {
        cultures.push(item);
      } else if (item.system.type === "hook") {
        hooks.push(item);
      } else if (item.system.type === "attitude") {
        forceAttitudes.push(item);
      }
    }

    return {
      cultures: cultures,
      hooks: hooks,
      forceAttitudes: forceAttitudes,
    }
  }

  /**
   * Retrieve all Moralities available for the player to buy
   * @returns {Promise<*[]>}
   */
  async getAvailableMoralities() {
    const sources = this.getSources("obligation");
    const obligations = [];

    for (const source of sources) {
      const pack = game.packs.get(source);
      if (!pack) {
        continue;
      }
      const items = await pack.getDocuments();
      for (const item of items) {
        item.pill = await foundry.applications.ux.TextEditor.enrichHTML(item?.link);
        obligations.push(item);
      }
    }

    for (const item of game.items.filter(i => i.type === "obligation")) {
      item.pill = await foundry.applications.ux.TextEditor.enrichHTML(item?.link);
      obligations.push(item);
    }

    return obligations;
  }

  /**
   * Retrieve all Species available for the player to buy
   * @returns {Promise<*[]>}
   */
  async getAvailableSpecies() {
    const sources = this.getSources("species");
    const species = [];

    for (const source of sources) {
      const pack = game.packs.get(source);
      if (!pack) {
        continue;
      }
      const items = await pack.getDocuments();
      for (const item of items) {
        item.pill = await foundry.applications.ux.TextEditor.enrichHTML(item?.link);
        species.push(item);
      }
    }

    for (const item of game.items.filter(i => i.type === "species")) {
      item.pill = await foundry.applications.ux.TextEditor.enrichHTML(item?.link);
      species.push(item);
    }

    return species;
  }

  /**
   * Retrieve all Careers available for the player to buy
   * @returns {Promise<*[]>}
   */
  async getAvailableCareers() {
    const sources = this.getSources("career");
    const careers = [];

    for (const source of sources) {
      const pack = game.packs.get(source);
      if (!pack) {
        continue;
      }
      const items = await pack.getDocuments();
      for (const item of items) {
        item.pill = await foundry.applications.ux.TextEditor.enrichHTML(item?.link);
        careers.push(item);
      }
    }

    for (const item of game.items.filter(i => i.type === "careers")) {
      item.pill = await foundry.applications.ux.TextEditor.enrichHTML(item?.link);
      careers.push(item);
    }

    return careers;
  }

  /**
   * Retrieve all Motivations available for the player to buy
   * @returns {Promise<*[]>}
   */
  async getAvailableMotivations() {
    const sources = this.getSources("motivation");
    const motivations = [];

    for (const source of sources) {
      const pack = game.packs.get(source);
      if (!pack) {
        continue;
      }
      const items = await pack.getDocuments();
      for (const item of items) {
        item.pill = await foundry.applications.ux.TextEditor.enrichHTML(item?.link);
        motivations.push(item);
      }
    }

    for (const item of game.items.filter(i => i.type === "motivation")) {
      item.pill = await foundry.applications.ux.TextEditor.enrichHTML(item?.link);
      motivations.push(item);
    }

    return motivations;
  }

  /**
   * Common function for retrieving compendiums for a specific item type
   * (reads from settings)
   * @param sourcesType
   * @returns {*}
   */
  getSources(sourcesType) {
    return game.settings.get("starwarsffg", `${sourcesType}Compendiums`).split(',');
  }

  /**
   * Handler for the user selecting which ruleset to use
  */
  static selectRules(event, target) {
    const choice = $(target).find(":checked")[0].value;
    this.data.selected.rules = choice;
    this.render(true);
  }

  /**
  * Handler for the user selecting their starting bonus
  */
  selectStartingBonus(choice) {
    CONFIG.logger.debug(`selected starting bonus ${choice}`);
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
   * Handler for culture selection
   * @param itemUuid
   * @param itemNametarget
   * @returns {Promise<void>}
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
   * Handler for hook selection
   * @param itemUuid
   * @param itemNametarget
   * @returns {Promise<void>}
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
   * Handler for forceAttitude selection
   * @param itemUuid
   * @param itemNametarget
   * @returns {Promise<void>}
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

  /** @override */
  async _onClickTab(event) {
    if ($(event.target).data("tab") === "review") {
      // force a re-render on the review tab so we are sure we're using the latest data
      await this.render(true);
    }
    await super._onClickTab(event);
  }

  async handleSpeciesSelect(event) {
    const target = $(event.currentTarget);
    const selectedSpecies = await fromUuid(target.data("source"));
    if (!selectedSpecies) {
      return ui.notifications.warn(`Unable to find species!`);
    }
    this.data.selected.species = selectedSpecies;
    await this.showCharacterStatus();
  }

  async handleCareerSelect(event) {
    const target = $(event.currentTarget);
    const selectedCareer = await fromUuid(target.data("source"));
    if (!selectedCareer) {
      return ui.notifications.warn(`Unable to find career!`);
    }
    this.data.selected.career = selectedCareer;
    this.data.selected.careerCareerSkillRanks = [];

    // update specialization information
    this.data.available.specializations = [];
    this.data.selected.specializationCareerSkillRanks = [];
    for (const specData of Object.values(selectedCareer.system.specializations)) {
      const specItem = await fromUuid(specData.source);
      if (specItem) {
        specItem.pill = await foundry.applications.ux.TextEditor.enrichHTML(specItem?.link);
        this.data.available.specializations.push(specItem);
      } else {
        CONFIG.logger.debug(`Unable to find specialization with UUID ${specData.source}`);
      }
    }

    await this.showCharacterStatus();
  }

  async handleObligationEdit(event) {
    const target = $(event.currentTarget);
    const action = target.data("action");
    const input = target.parent().parent().children("td").children("input");
    const obligationIndex = target.data("index");
    const editBtn = target.parent().parent().children("td").children(".fa-edit");
    const saveBtn = target.parent().parent().children("td").children(".fa-save");

    if (action === "edit") {
      input.prop("disabled", false);
      editBtn.addClass("control-inactive");
      editBtn.removeClass("control-active");
      saveBtn.addClass("control-active");
      saveBtn.removeClass("control-inactive");
    } else if (action === "save") {
      for (const attr of input) {
        const propName = attr.name;
        const propValue = attr.value;
        this.data.selected.obligations[obligationIndex]["system"][propName] = propValue;
      }
      input.prop("disabled", true);

      editBtn.addClass("control-active");
      editBtn.removeClass("control-inactive");
      saveBtn.addClass("control-inactive");
      saveBtn.removeClass("control-active");
    } else if (action === "deselect") {
      this.data.selected.obligations.splice(obligationIndex, 1);
      target.parent().parent().remove();
    }
  }

  async handleObligationSelect(event) {
    const target = $(event.currentTarget);
    const selectedObligation = await fromUuid(target.data("source"));
    if (!selectedObligation) {
      return ui.notifications.warn(`Unable to find obligation!`);
    }
    this.data.selected.obligations.push(selectedObligation);
    await this.showCharacterStatus();
  }

  async handleSpecializationSelect(event) {
    const target = $(event.currentTarget);
    const selectedSpecialization = await fromUuid(target.data("source"));
    if (!selectedSpecialization) {
      return ui.notifications.warn(`Unable to find specialization!`);
    }
    this.data.selected.specialization = selectedSpecialization;
    this.data.selected.specializationCareerSkillRanks = [];
    await this.showCharacterStatus();
  }

  async showCharacterStatus() {
    // temporary: delete previous copies of the actor
    const existingActor = game.actors.getName("temp actor");
    if (existingActor) {
      await existingActor.delete();
    }

    // temporary: create a new actor to add stuff to
    console.log("creating temp actor...")
    const tempActor = await Actor.create(
      {
        name: "temp actor",
        type: "character",
        displaySheet: false,
      },
    );

    console.log("updating XP for temp actor")
    const totalXp = 100;
    const availableXp = 100;
    if (this.data.selected.species?.uuid) {
      await tempActor.update({
        "system.experience": {
          total: totalXp,
          available: availableXp,
        }
      });
    }

    console.log("applying XP purchases")
    // apply purchases
    for (const characteristicPurchase of this.data.purchases.xp.characteristics) {
      const updateKey = `system.characteristics.${characteristicPurchase.key}.value`;
      const newValue = tempActor.system.characteristics[characteristicPurchase.key].value + 1;
      await tempActor.update({[updateKey]: newValue})
    }
    for (const skillPurchase of this.data.purchases.xp.skills) {
      const updateKey = `system.skills.${skillPurchase.key}.rank`;
      const newValue = tempActor.system.skills[skillPurchase.key].rank + 1;
      await tempActor.update({[updateKey]: newValue})
    }

    // add items to the actor
    const items = [];
    // the various item types are in slightly different formats, so let's add them explicitly
    // backgrounds
    for (const backKey of Object.keys(this.data.selected.background)) {
      if (this.data.selected.background[backKey]?.uuid) {
        items.push(this.data.selected.background[backKey]);
      }
    }
    // obligations
    for (const item of this.data.selected.obligations) {
      if (item?.uuid) {
        items.push(item);
      }
    }
    // species
    if (this.data.selected.species?.uuid) {
      items.push(this.data.selected.species);
    }
    // career (skill ranks are later)
    if (this.data.selected.career?.uuid) {
      items.push(this.data.selected.career);
    }
    // specialization (skill ranks are later)
    if (this.data.selected.specialization?.uuid) {
      items.push(this.data.selected.specialization);
    }
    // motivations
    for (const item of this.data.selected.motivations) {
      if (item?.uuid) {
        items.push(item);
      }
    }
    console.log("adding the following items to the temp actor")
    console.log(items)
    await tempActor.createEmbeddedDocuments("Item", items);

    // apply career skill ranks from career and specialization
    const careerItem = tempActor.items.find(i => i.type === "career");
    if (careerItem) {
      for (const skillPurchase of this.data.selected.careerCareerSkillRanks) {
        const nk = new Date().getTime();
        await careerItem.update({
          "system.attributes": {
            [`attr${nk}`]: {
              modtype: "Skill Rank",
              mod: skillPurchase,
              value: 1,
            },
          }
        });
        const AE = {
          name: `attr${nk}`,
          changes: [{
            key: `system.skills.${skillPurchase}.rank`,
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: 1,
          }],
        };
        await careerItem.createEmbeddedDocuments("ActiveEffect", [AE]);
      }
    }

    const specializationItem = tempActor.items.find(i => i.type === "specialization" && i.name === this.data.selected.specialization?.name);
    if (specializationItem) {
      for (const skillPurchase of this.data.selected.specializationCareerSkillRanks) {
        const nk = new Date().getTime();
        await specializationItem.update({
          "system.attributes": {
            [`attr${nk}`]: {
              modtype: "Skill Rank",
              mod: skillPurchase,
              value: 1,
            },
          }
        });
        const AE = {
          name: `attr${nk}`,
          changes: [{
            key: `system.skills.${skillPurchase}.rank`,
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: 1,
          }],
        };
        await specializationItem.createEmbeddedDocuments("ActiveEffect", [AE]);
      }
    }
    console.log("assigning to local actor record")
    this.tempActor = tempActor;
    console.log("re-rendering")
    this.render();
  }

  async handleCharacteristicModify(event) {
    const target = $(event.currentTarget);
    const characteristic = target.data("target");
    const direction = target.data("direction");
    const curValue = parseInt(target.data("value"));
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
    const skill = target.data("target").replace(" ", " ");
    const direction = target.data("direction");
    const curValue = target.data("value");
    const skillMode = target.data("mode");
    let newValue;
    if (skillMode === "career") {
      if (direction === "increase") {
        this.data.selected.careerCareerSkillRanks.push(skill);
      } else {
        const purchaseIndex = this.data.selected.careerCareerSkillRanks.findIndex(function (purchase) {
          return purchase === skill;
        });
        this.data.selected.careerCareerSkillRanks.splice(purchaseIndex, 1);
      }
    } else if (skillMode === "specialization") {
      if (direction === "increase") {
        this.data.selected.specializationCareerSkillRanks.push(skill);
      } else {
        const purchaseIndex = this.data.selected.specializationCareerSkillRanks.findIndex(function (purchase) {
          return purchase === skill;
        });
        this.data.selected.specializationCareerSkillRanks.splice(purchaseIndex, 1);
      }
    } else {
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
        const purchaseIndex = this.data.purchases.xp.skills.findIndex(function (purchase) {
          return purchase.key === skill && purchase.value === curValue;
        });
        this.data.purchases.xp.skills.splice(purchaseIndex, 1);
      }
    }
    // rebuild the actor to apply the changes
    await this.showCharacterStatus();
  }

  async handleSpecializationPurchase(event) {
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
        return ui.notifications.warn(game.i18n.localize("SWFFG.Actors.Sheets.Purchase.NotEnoughXP"));
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
      return ui.notifications.warn(`Unable to find force power ${forcePowerName} with upgrade ${upgrade}! bailing`);
    }
    const wasLearned = parentForcePower.system.upgrades[upgrade]?.islearned || false
    const cost = target.data("cost");

    parentForcePower.system.upgrades[upgrade].islearned = !wasLearned;

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
        return ui.notifications.warn(`Unable to find specialization ${specializationName} talent ${talent} is within! bailing`);
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

  async calcObligation() {
    let starting = 0;
    let available = 0;
    let key;

    if (this.data.selected.rules === "fad") {
      starting = this.data.initial.morality;
      available = starting;
      key = "morality";
      if (this.data.selected.startingBonus === "21_plus_morality") {
        available += 21;
      } else if (this.data.selected.startingBonus === "21_minus_morality") {
        available -= 21;
      }
    } else if (this.data.selected.rules === "eote") {
      starting = this.data.initial.obligation;
      available = starting;
      key = "obligation";
      if (this.data.selected.startingBonus === "5xp") {
        available += 5;
      } else if (this.data.selected.startingBonus === "10xp") {
        available += 10;
      } else if (this.data.selected.startingBonus === "1k_credits") {
        available += 5;
      } else if (this.data.selected.startingBonus === "2k_credits") {
        available += 10;
      }
    } else if (this.data.selected.rules === "aor") {
      starting = this.data.initial.duty;
      available = starting;
      key = "duty";
      if (this.data.selected.startingBonus === "5xp") {
        available -= 5;
      } else if (this.data.selected.startingBonus === "10xp") {
        available -= 10;
      } else if (this.data.selected.startingBonus === "1k_credits") {
        available -= 5;
      } else if (this.data.selected.startingBonus === "2k_credits") {
        available -= 10;
      }
    }
    return {
      starting: starting,
      available: available,
      key: key,
    }
  }

  async handleCreditPurchase(event) {
    const target = $(event.currentTarget);
    const itemUuid = target.data("source");
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

  async createActor() {
    CONFIG.logger.debug("Creating new actor...");
    const actorName = `${game.user.name}'s new actor!`;
    // TODO: validate state before creating actor
    // temporary: delete previous copies of the actor
    const existingActor = game.actors.getName(actorName);
    if (existingActor) {
      CONFIG.logger.debug("Deleting old actor");
      await existingActor.delete();
    }

    const newActor = await Actor.create(
      {
        name: actorName,
        type: "character",
        displaySheet: false,
      },
    );

    const xp = await this.calcXp();
    const totalXp = xp.total;
    const availableXp = xp.available;

    // grant XP
    await newActor.update({
      "system.experience": {
        total: totalXp,
        available: availableXp,
      }
    });

    // apply XP purchases
    for (const characteristicPurchase of this.data.purchases.xp.characteristics) {
      const updateKey = `system.characteristics.${characteristicPurchase.key}.value`;
      const newValue = newActor.system.characteristics[characteristicPurchase.key].value + 1;
      await newActor.update({[updateKey]: newValue})
    }
    for (const skillPurchase of this.data.purchases.xp.skills) {
      const updateKey = `system.skills.${skillPurchase.key}.rank`;
      const newValue = newActor.system.skills[skillPurchase.key].rank + 1;
      await newActor.update({[updateKey]: newValue})
    }

    // add actor items to the actor
    const items = [];
    // the various item types are in slightly different formats, so let's add them explicitly
    // backgrounds
    for (const backKey of Object.keys(this.data.selected.background)) {
      if (this.data.selected.background[backKey]?.uuid) {
        items.push(this.data.selected.background[backKey]);
      }
    }
    // obligations
    for (const item of this.data.selected.obligations) {
      if (item?.uuid) {
        items.push(item);
      }
    }
    // species
    if (this.data.selected.species?.uuid) {
      items.push(this.data.selected.species);
    }
    // career (skill ranks are later)
    if (this.data.selected.career?.uuid) {
      items.push(this.data.selected.career);
    }
    // specialization (skill ranks are later)
    if (this.data.selected.specialization?.uuid) {
      items.push(this.data.selected.specialization);
    }
    // motivations
    for (const item of this.data.selected.motivations) {
      if (item?.item?.uuid) {
        items.push(item);
      }
    }

    CONFIG.logger.debug(`Granting the following items: ${JSON.stringify(items)}`);
    await newActor.createEmbeddedDocuments("Item", items);

    // apply credit purchases
    const credits = await this.calcCredits();
    const creditItems = [];
    for (const creditItem of this.data.purchases.credits) {
      creditItems.push(creditItem.item);
    }
    CONFIG.logger.debug(`Processed the following credit purchases: ${JSON.stringify(creditItems)}`);

    await newActor.createEmbeddedDocuments("Item", creditItems);
    await newActor.update({
      "system.stats.credits": {
        value: credits.available,
      }
    });

    // apply XP spend log items

    // apply obligation values
    const obligation = await this.calcObligation();
    await newActor.update({"system": {
      [obligation.key]: {
        value: obligation.available,
      }
    }});

    const careerItem = newActor.items.find(i => i.type === "career");
    if (careerItem) {
      for (const skillPurchase of this.data.selected.careerCareerSkillRanks) {
        const nk = new Date().getTime();
        await careerItem.update({
          "system.attributes": {
            [`attr${nk}`]: {
              modtype: "Skill Rank",
              mod: skillPurchase,
              value: 1,
            },
          }
        });
        const AE = {
          name: `attr${nk}`,
          changes: [{
            key: `system.skills.${skillPurchase}.rank`,
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: 1,
          }],
        };
        await careerItem.createEmbeddedDocuments("ActiveEffect", [AE]);
      }
    }

    const specializationItem = newActor.items.find(i => i.type === "specialization" && i.name === this.data.selected.specialization?.name);
    if (specializationItem) {
      for (const skillPurchase of this.data.selected.specializationCareerSkillRanks) {
        const nk = new Date().getTime();
        await specializationItem.update({
          "system.attributes": {
            [`attr${nk}`]: {
              modtype: "Skill Rank",
              mod: skillPurchase,
              value: 1,
            },
          }
        });
        const AE = {
          name: `attr${nk}`,
          changes: [{
            key: `system.skills.${skillPurchase}.rank`,
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: 1,
          }],
        };
        await specializationItem.createEmbeddedDocuments("ActiveEffect", [AE]);
      }
    }

    await xpLogEarn(newActor, totalXp, totalXp, totalXp, "Initial State");
    await xpLogSpend(newActor, "Character Creation Changes", totalXp - availableXp, availableXp, totalXp);

    newActor.sheet.render(true);
  }
}
