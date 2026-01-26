class CharacterTour extends foundry.nue.Tour {
  #originalDeactivate = null;

  async start() {
    await this.createActor();
    // fix for tooltips sometimes dismissing the tour
    // Store the original deactivate method and replace it with one that respects tour state
    this.#originalDeactivate = game.tooltip.deactivate.bind(game.tooltip);
    game.tooltip.deactivate = () => {
      // Don't deactivate tooltips during the tour
      if (foundry.nue.Tour.tourInProgress) return;
      this.#originalDeactivate();
    };
    await super.start();
  }

  /** override */
  async _preStep() {

    const currentStep = this.currentStep;

    if (currentStep.id === "roll-dice") {
      await this.giveActorStats();
    } else if (currentStep.id === "dice-pool") {
      // render the dice roller for info about it
      $("[data-ability=\"Athletics\"] .pure-u-6-24 .dice-pool").trigger("click");
      await delay(100);
    } else if (currentStep.id === "spending-xp-1") {
      // close the dice roller
      $("#roll-builder .control.close").trigger("click");
      await delay(100);
    }

    await super._preStep();
  }

  /** override */
  async _postStep() {
    await super._postStep();
    if (this.currentStep?.id === "spending-xp-3") {
      await this.deleteActor();
    }
  }

  /** override */
  async exit() {
    // Restore original tooltip deactivate method
    if (this.#originalDeactivate) {
      game.tooltip.deactivate = this.#originalDeactivate;
      this.#originalDeactivate = null;
    }
    await this.deleteActor();
    await super.exit();
  }

  async createActor() {
    this.tempActor = await createActor();
    this.tempActor.sheet.bringToTop();
    await delay(100);
  }

  async deleteActor() {
    await this.tempActor.delete()
  }

  async giveActorStats() {
    await this.tempActor.update({"system.characteristics.Brawn.value": 3});
    await delay(100);
  }
}

class EditModeTour extends foundry.nue.Tour {
  #originalDeactivate = null;

  async start() {
    await this.createActor();
    await this.giveActorAE();
    // fix for tooltips sometimes dismissing the tour
    // Store the original deactivate method and replace it with one that respects tour state
    this.#originalDeactivate = game.tooltip.deactivate.bind(game.tooltip);
    game.tooltip.deactivate = () => {
      // Don't deactivate tooltips during the tour
      if (foundry.nue.Tour.tourInProgress) return;
      this.#originalDeactivate();
    };
    await super.start();
  }

  /** override */
  async _preStep() {
    const currentStep = this.currentStep;

    if (currentStep.id === "enable-edit-mode") {
      $(".ffg-sheet-options").trigger("click");
      await delay(100);
    } else if (currentStep.id === "stat-changes") {
      await this.enableEditMode();
    }

    await super._preStep();
  }

  /** override */
  async _postStep() {
    await super._postStep();
    if (this.currentStep?.id === "disable-edit-mode") {
      await this.deleteActor();
    }
  }

  /** override */
  async exit() {
    // Restore original tooltip deactivate method
    if (this.#originalDeactivate) {
      game.tooltip.deactivate = this.#originalDeactivate;
      this.#originalDeactivate = null;
    }
    await this.deleteActor();
    await super.exit();
  }

  async createActor() {
    this.tempActor = await createActor();
    this.tempActor.sheet.bringToTop();
    await delay(100);
  }

  async deleteActor() {
    await this.tempActor.delete()
  }

  /**
   * Give the actor an AE so it can be suspended when we enable Edit Mode
   * @returns {Promise<void>}
   */
  async giveActorAE() {
    const AEData = {
      changes: [{
        key: "system.characteristics.Brawn.value",
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: 3,
      }],
      name: "example",
      disabled: false,
    };
    await this.tempActor.createEmbeddedDocuments("ActiveEffect", [AEData]);
    await delay(100);
  }

  /**
   * Trigger Edit Mode on the actor so we can show changes with it on
   * @returns {Promise<void>}
   */
  async enableEditMode() {
    $("[name=\"config.enableEditMode\"]").trigger("click");
    $("[data-button=\"one\"]").trigger("click");
    await delay(300);
  }
}

/**
 * Register our tours for Foundry to see
 * @returns {Promise<void>}
 */
export async function register_system_tours() {
  try {
    game.tours.register("starwarsffg", 'character', await CharacterTour.fromJSON('/systems/starwarsffg/modules/tours/character.json'));
    game.tours.register("starwarsffg", 'edit-mode', await EditModeTour.fromJSON('/systems/starwarsffg/modules/tours/edit-mode.json'));
  } catch (error) {
    console.error("MyTour | Error registering tours: ",error);
  }
}

const delay = (delayInMs) => {
  return new Promise(resolve => setTimeout(resolve, delayInMs));
};

/**
 * Create an actor for showing the tour within
 * @returns {Promise<Document|Document[]|undefined>}
 */
async function createActor() {
  const tempActorData = {
    name: "Tutorial Character",
    type: "character",
  };
  const tempActor = await Actor.create(tempActorData);

  await tempActor.sheet.render(true);
  // wait for the rendering to actually finish
  await new Promise(async resolve => {
    while (!tempActor.sheet.rendered) {
      await delay(5);
    }
    resolve();
  });
  return tempActor;
}
