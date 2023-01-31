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

    this.terms = this.parseShortHand(this.terms);

    if (args[2]?.success) {
      this.ffg.success += +args[2].success;
      this.addedResults.push({
        type: "Success",
        symbol: PopoutEditor.renderDiceImages("[SU]"),
        value: Math.abs(+args[2].success),
        negative: +args[2].success < 0,
      });
    }
    if (args[2]?.failure) {
      this.ffg.failure += +args[2].failure;
      this.addedResults.push({
        type: "Failure",
        symbol: PopoutEditor.renderDiceImages("[FA]"),
        value: Math.abs(+args[2].failure),
        negative: +args[2].failure < 0,
      });
    }
    if (args[2]?.advantage) {
      this.ffg.advantage += +args[2].advantage;
      this.addedResults.push({
        type: "Advantage",
        symbol: PopoutEditor.renderDiceImages("[AD]"),
        value: Math.abs(+args[2].advantage),
        negative: +args[2].advantage < 0,
      });
    }
    if (args[2]?.threat) {
      this.ffg.threat += +args[2].threat;
      this.addedResults.push({
        type: "Threat",
        symbol: PopoutEditor.renderDiceImages("[TH]"),
        value: Math.abs(+args[2].threat),
        negative: +args[2].threat < 0,
      });
    }
    if (args[2]?.light) {
      this.ffg.light += +args[2].light;
      this.addedResults.push({
        type: "Light",
        symbol: PopoutEditor.renderDiceImages("[LI]"),
        value: Math.abs(+args[2].light),
        negative: +args[2].light < 0,
      });
    }
    if (args[2]?.dark) {
      this.ffg.dark += +args[2].dark;
      this.addedResults.push({
        type: "Dark",
        symbol: PopoutEditor.renderDiceImages("[DA]"),
        value: Math.abs(+args[2].dark),
        negative: +args[2].dark < 0,
      });
    }
    if (args[2]?.triumph) {
      this.ffg.triumph += +args[2].triumph;
      this.ffg.success += +args[2].triumph;
      this.addedResults.push({
        type: "Triumph",
        symbol: PopoutEditor.renderDiceImages("[TR]"),
        value: Math.abs(+args[2].triumph),
        negative: +args[2].triumph < 0,
      });
    }
    if (args[2]?.despair) {
      this.ffg.despair += +args[2].despair;
      this.ffg.failure += +args[2].despair;
      this.addedResults.push({
        type: "Despair",
        symbol: PopoutEditor.renderDiceImages("[DE]"),
        value: Math.abs(+args[2].despair),
        negative: +args[2].despair < 0,
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
    if (this._evaluated) throw new Error("This Roll object has already been rolled.");

    // Step 0 - is this rolling nothing?
    if(this.terms.length == 0) {
      this._evaluated = true
      this._total = 0
      return this
    }

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
          if (!(term instanceof OperatorTerm)) this.hasStandard = true;
          return term.evaluate({ minimize, maximize }).total;
        } else return term;
      } else {
        if (term.evaluate) term.evaluate({ minimize, maximize });
        this.hasFFG = true;
        return 0;
      }
    });

    // Step 4 - safely evaluate the final total
    const total = Roll.safeEval(this.results.join(" "));
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
    this._evaluated = true;
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
      if (game.ffg.diceterms.includes(cls)) isFFG = "isFFG";
      return {
        formula: d.formula,
        total: d.total,
        faces: d.faces,
        flavor: d.options.flavor,
        isFFG: game.ffg.diceterms.includes(cls),
        notFFG: !game.ffg.diceterms.includes(cls),
        rolls: d.results.map((r) => {
          return {
            result: d.getResultLabel(r),
            classes: [cls.name.toLowerCase(), isFFG, "d" + d.faces, r.rerolled ? "rerolled" : null, r.exploded ? "exploded" : null, r.discarded ? "discarded" : null, r.result === 1 ? "min" : null, r.result === d.faces ? "max" : null].filterJoin(" "),
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
        user: game.user.id,
        flavor: null,
        template: this.constructor.CHAT_TEMPLATE,
        blind: false,
      },
      chatOptions
    );
    const isPrivate = chatOptions.isPrivate;

    // Execute the roll, if needed
    if (!this._evaluated) this.roll();

    // Define chat data
    if (this?.data) {
      if (this.data.flags?.starwarsffg?.uuid) {
        const item = await fromUuid(this.data.flags.starwarsffg.uuid);
        if (item) {
          this.data = item;
        }
      }
      else if (this.data.flags?.starwarsffg?.ffgUuid) {
        const item = await fromUuid(this.data.flags.starwarsffg.ffgUuid);
        if (item) {
          this.data = item;
        }
      }
      this.data.additionalFlavorText = this.flavorText;
    } else {
      this.data = {
        additionalFlavorText: this.flavorText,
      };
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
              isFFG: game.ffg.diceterms.includes(cls),
              rolls: d.results.map((r) => {
                return {
                  result: d.getResultLabel(r),
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
    if (chatData?.data?.flags?.starwarsffg.hasOwnProperty('crew')) {
      chatData.data.crew = chatData.data.flags.starwarsffg.crew;
    }
    if (chatData.data.hasOwnProperty('data') && (chatData.data.data.adjusteditemmodifier === undefined || chatData.data.data.adjusteditemmodifier.length === 0)) {
      // extended metadata is missing, lookup the actor ID so we can embed it for future lookups
      let candidate_actors = game.actors.filter(actor => actor.items.filter(item => item.id === chatData.data._id).length > 0);
      if (candidate_actors.length > 0) {
        if (game.settings.get("starwarsffg", "oldWorldCompatability")) {
          let test_item = game.actors.get(candidate_actors[0].id).items.get(chatData.data._id);
          // for whatever reason, sometimes the item we read doesn't have modifiers even though the chat item does
          // check if this is the case and correct it if it is
          try {
            if (test_item.data?.data?.itemmodifier.length === 0 && chatData.data?.data?.itemmodifier) {
              // there aren't any modifiers on the object, try copying the temp object to it so the link works
              test_item.data.data.itemmodifier = chatData.data.data.itemmodifier;
            }
          } catch (exception) {
            // required data was missing - best to just move along, citizen
          }
        }
        // fake the UUID flag so we can do the lookup within chat messages
        chatData.data.flags.starwarsffg.ffgUuid = 'Actor.' + candidate_actors[0].id + '.Item.' + chatData.data._id;
      }
    }

    // Render the roll display template
    return renderTemplate(chatOptions.template, chatData);
  }

  /* -------------------------------------------- */
  /** @override */
  async toMessage(messageData = {}, { rollMode = null, create = true } = {}) {
    // Perform the roll, if it has not yet been rolled
    if (!this._evaluated) this.evaluate();

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
        user: game.user.id,
        type: template,
        content: this.total,
        sound: CONFIG.sounds.dice,
      },
      messageData
    );
    messageData.roll = this;

    Hooks.call("ffgDiceMessage", this);

    // Either create the message or just return the chat data
    const cls = getDocumentClass("ChatMessage");
    const msg = new cls(messageData);
    if (rMode) msg.applyRollMode(rollMode);

    // Either create or return the data
    return create ? cls.create(msg) : msg;
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

  //If the main parser hands back a StringTerm attempt to turn it into a die.
  parseShortHand(terms) {
    return terms
      .flatMap(t => {
        if(!(t instanceof StringTerm) || /\d/.test(t.term))
          return t;

        return t.term.replaceAll('d', 'i').split('').reduce((acc, next) => {
          if(next in CONFIG.Dice.terms)
          {
            let cls = CONFIG.Dice.terms[next];
            acc.push(new cls(1));
          }
          else throw new Error(`Unknown die type '${next}'`)

          return acc;
        }, [])
      })
      .flatMap((value, index, array) => //Put addition operators between each die.
        array.length - 1 !== index
          ? [value, new OperatorTerm({operator: '+'})]
          : value)
  }
}
