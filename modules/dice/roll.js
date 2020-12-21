import PopoutEditor from "../popout-editor.js";
import { ForceDie } from "./dietype/ForceDie.js";

/**
 * New extension of the core DicePool class for evaluating rolls with the FFG DiceTerms
 */
export class RollFFG extends Roll {
  constructor(...args) {
    super(...args);
    this.ffg = { success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 };
    this.hasFFG = false;
    this.hasStandard = false;
    this.addedResults = [];

    if (args[2]?.success) {
      this.ffg.success = +args[2].success;
      this.addedResults.push({
        type: "Success",
        symbol: PopoutEditor.renderDiceImages("[SU]"),
        value: Math.abs(+args[2].success),
        negative: +args[2].success < 0,
      });
    }
    if (args[2]?.failure) {
      this.ffg.failure = +args[2].failure;
      this.addedResults.push({
        type: "Failure",
        symbol: PopoutEditor.renderDiceImages("[FA]"),
        value: Math.abs(+args[2].failure),
        negative: +args[2].failure < 0,
      });
    }
    if (args[2]?.advantage) {
      this.ffg.advantage = +args[2].advantage;
      this.addedResults.push({
        type: "Advantage",
        symbol: PopoutEditor.renderDiceImages("[AD]"),
        value: Math.abs(+args[2].advantage),
        negative: +args[2].advantage < 0,
      });
    }
    if (args[2]?.threat) {
      this.ffg.threat = +args[2].threat;
      this.addedResults.push({
        type: "Threat",
        symbol: PopoutEditor.renderDiceImages("[TH]"),
        value: Math.abs(+args[2].threat),
        negative: +args[2].threat < 0,
      });
    }
    if (args[2]?.light) {
      this.ffg.light = +args[2].light;
      this.addedResults.push({
        type: "Light",
        symbol: PopoutEditor.renderDiceImages("[LI]"),
        value: Math.abs(+args[2].light),
        negative: +args[2].light < 0,
      });
    }
    if (args[2]?.dark) {
      this.ffg.dark = +args[2].dark;
      this.addedResults.push({
        type: "Dark",
        symbol: PopoutEditor.renderDiceImages("[DA]"),
        value: Math.abs(+args[2].dark),
        negative: +args[2].dark < 0,
      });
    }

    if (args[3]) {
      this.flavorText = args[3];
    }
  }

  static CHAT_TEMPLATE = "systems/starwarsffg/templates/dice/roll-ffg.html";

  static TOOLTIP_TEMPLATE = "systems/starwarsffg/templates/dice/tooltip-ffg.html";

  /* -------------------------------------------- */

  /* -------------------------------------------- */
  /** @override */
  evaluate({ minimize = false, maximize = false } = {}) {
    if (this._rolled) throw new Error("This Roll object has already been rolled.");

    // Step 1 - evaluate any inner Rolls and recompile the formula
    let hasInner = false;
    this.terms = this.terms.map((t) => {
      if (t instanceof RollFFG) {
        hasInner = true;
        t.evaluate({ minimize, maximize });
        this._dice = this._dice.concat(t.dice);
        return `${t.total}`;
      }
      return t;
    });

    // Step 2 - if inner rolls occurred, re-compile the formula and re-identify terms
    if (hasInner) {
      const formula = this.constructor.cleanFormula(this.terms);
      this.terms = this._identifyTerms(formula);
    }

    // Step 3 - evaluate any remaining terms and return any non-FFG dice to the total.
    this.results = this.terms.map((term) => {
      if (!game.ffg.diceterms.includes(term.constructor)) {
        if (term.evaluate) {
          this.hasStandard = true;
          return term.evaluate({ minimize, maximize }).total;
        } else return term;
      } else {
        if (term.evaluate) term.evaluate({ minimize, maximize });
        this.hasFFG = true;
        return 0;
      }
    });

    // Step 4 - safely evaluate the final total
    const total = this._safeEval(this.results.join(" "));
    if (!Number.isNumeric(total)) {
      throw new Error(game.i18n.format("DICE.ErrorNonNumeric", { formula: this.formula }));
    }

    // Step 5 - Retrieve all FFG results and combine into a single total.
    if (this.hasFFG) {
      this.terms.forEach((term) => {
        if (game.ffg.diceterms.includes(term.constructor)) {
          this.ffg.success += parseInt(term.ffg.success);
          this.ffg.failure += parseInt(term.ffg.failure);
          this.ffg.advantage += parseInt(term.ffg.advantage);
          this.ffg.threat += parseInt(term.ffg.threat);
          this.ffg.triumph += parseInt(term.ffg.triumph);
          this.ffg.despair += parseInt(term.ffg.despair);
          this.ffg.light += parseInt(term.ffg.light);
          this.ffg.dark += parseInt(term.ffg.dark);
        }
      });

      // Step 6 - Calculate actual results by cancelling out success with failure, advantage with threat etc.
      if (this.ffg.success < this.ffg.failure) {
        this.ffg.failure -= parseInt(this.ffg.success);
        this.ffg.success = 0;
      } else {
        this.ffg.success -= parseInt(this.ffg.failure);
        this.ffg.failure = 0;
      }
      if (this.ffg.advantage < this.ffg.threat) {
        this.ffg.threat -= parseInt(this.ffg.advantage);
        this.ffg.advantage = 0;
      } else {
        this.ffg.advantage -= parseInt(this.ffg.threat);
        this.ffg.threat = 0;
      }
    }

    // Store final outputs
    this._total = total;
    this._rolled = true;
    return this;
  }

  /* -------------------------------------------- */
  /** @override */
  roll() {
    return this.evaluate();
  }

  /* -------------------------------------------- */
  /** @override */
  getTooltip() {
    const parts = this.dice.map((d) => {
      const cls = d.constructor;
      let isFFG = "notFFG";
      if (game.ffg.diceterms.includes(d.constructor)) isFFG = "isFFG";
      return {
        formula: d.formula,
        total: d.total,
        faces: d.faces,
        flavor: d.options.flavor,
        isFFG: game.ffg.diceterms.includes(d.constructor),
        notFFG: !game.ffg.diceterms.includes(d.constructor),
        rolls: d.results.map((r) => {
          return {
            result: cls.getResultLabel(r.result),
            classes: [cls.name.toLowerCase(), isFFG, "d" + d.faces, r.rerolled ? "rerolled" : null, r.exploded ? "exploded" : null, r.discarded ? "discarded" : null, r.result === 1 ? "min" : null, r.result === d.faces ? "max" : null].filter((c) => c).join(" "),
          };
        }),
      };
    });
    parts.addedResults = this.addedResults;
    parts.flavorText = this.flavorText;
    return renderTemplate(this.constructor.TOOLTIP_TEMPLATE, { parts });
  }

  /* -------------------------------------------- */
  /** @override */
  async render(chatOptions = {}) {
    chatOptions = mergeObject(
      {
        user: game.user._id,
        flavor: null,
        template: this.constructor.CHAT_TEMPLATE,
        blind: false,
      },
      chatOptions
    );
    const isPrivate = chatOptions.isPrivate;

    // Execute the roll, if needed
    if (!this._rolled) this.roll();

    // Define chat data
    if (this?.data) {
      this.data.additionalFlavorText = this.flavorText;
    }

    const chatData = {
      formula: isPrivate ? "???" : this._formula,
      flavor: isPrivate ? null : chatOptions.flavor,
      user: chatOptions.user,
      tooltip: isPrivate ? "" : await this.getTooltip(),
      total: isPrivate ? "?" : Math.round(this.total * 100) / 100,
      ffg: isPrivate ? {} : this.ffg,
      ffgDice: isPrivate
        ? {}
        : this.dice.map((d) => {
            const cls = d.constructor;
            return {
              isFFG: game.ffg.diceterms.includes(d.constructor),
              rolls: d.results.map((r) => {
                return {
                  result: cls.getResultLabel(r.result),
                };
              }),
            };
          }),
      hasFFG: this.hasFFG,
      hasStandard: this.hasStandard,
      hasSuccess: this.dice.filter((i) => i.constructor !== ForceDie).length > 0,
      diceresults: CONFIG.FFG.diceresults,
      data: this.data,
      addedResults: this.addedResults,
      publicRoll: !chatOptions.isPrivate,
    };

    // Render the roll display template
    return renderTemplate(chatOptions.template, chatData);
  }

  /* -------------------------------------------- */
  /** @override */
  toMessage(messageData = {}, { rollMode = null, create = true } = {}) {
    // Perform the roll, if it has not yet been rolled
    if (!this._rolled) this.evaluate();

    const rMode = rollMode || messageData.rollMode || game.settings.get("core", "rollMode");

    let template = CONST.CHAT_MESSAGE_TYPES.ROLL;
    if (["gmroll", "blindroll"].includes(rMode)) {
      messageData.whisper = ChatMessage.getWhisperRecipients("GM");
    }
    if (rMode === "blindroll") messageData.blind = true;
    if (rMode === "selfroll") messageData.whisper = [game.user.id];

    // Prepare chat data
    messageData = mergeObject(
      {
        user: game.user._id,
        type: template,
        content: this.total,
        sound: CONFIG.sounds.dice,
      },
      messageData
    );
    messageData.roll = this;

    // Prepare message options
    const messageOptions = { rollMode: rMode };

    // Either create the message or just return the chat data
    return create ? CONFIG.ChatMessage.entityClass.create(messageData, messageOptions) : messageData;
  }

  /** @override */
  toJSON() {
    const json = super.toJSON();
    json.ffg = this.ffg;
    json.hasFFG = this.hasFFG;
    json.hasStandard = this.hasStandard;
    json.data = this.data;
    json.addedResults = this.addedResults;
    json.flavorText = this.flavorText;
    return json;
  }

  /** @override */
  static fromData(data) {
    const roll = super.fromData(data);
    roll.ffg = data.ffg;
    roll.hasFFG = data.hasFFG;
    roll.hasStandard = data.hasStandard;
    roll.data = data.data;
    roll.addedResults = data.addedResults;
    roll.flavorText = data.flavorText;
    return roll;
  }
}
