/**
 * A specialized form used to pop out the editor.
 * @extends {FormApplication}
 */
export default class DestinyTracker extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "destiny-tracker",
      classes: ["starwarsffg"],
      title: "Destiny Tracker",
      template: "systems/starwarsffg/templates/ffg-destiny-tracker.html",
    });
  }

  /** @override */
  getData() {
    // Get current value
    let destinyPool = { light: game.settings.get("starwarsffg", "dPoolLight"), dark: game.settings.get("starwarsffg", "dPoolDark") };

    const x = $(window).width();
    const y = $(window).height();

    this.position.left = x;
    this.position.top = y;

    // Return data
    return {
      destinyPool,
    };
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {}

  /** @override */
  activateListeners(html) {
    const topHeader = html.find(".swffg-destiny-bar")[0];
    new Draggable(this, html, topHeader, this.options.resizable);
    const bottomHeader = html.find(".swffg-destiny-bar")[1];
    new Draggable(this, html, bottomHeader, this.options.resizable);

    $("#destiny-tracker").css({ bottom: "0px", right: "305px" });

    html.find(".destiny-points").click(async (event) => {
      const pointType = event.currentTarget.dataset.group;
      var typeName = null;
      const add = event.shiftKey;
      const remove = event.ctrlKey;
      var flipType = null;
      var actionType = null;
      if (pointType == "dPoolLight") {
        flipType = "dPoolDark";
        typeName = "Light Side point";
      } else {
        flipType = "dPoolLight";
        typeName = "Dark Side point";
      }
      var messageText;

      if (!add && !remove) {
        if (game.settings.get("starwarsffg", pointType) == 0) {
          ui.notifications.warn(`Cannot flip a ${typeName} point; 0 remaining.`);
          return;
        } else {
          if (game.user.isGM) {
            game.settings.set("starwarsffg", flipType, game.settings.get("starwarsffg", flipType) + 1);
            game.settings.set("starwarsffg", pointType, game.settings.get("starwarsffg", pointType) - 1);
          } else {
            let pool = { light: 0, dark: 0 };
            if (flipType == "dPoolLight") {
              pool.light = game.settings.get("starwarsffg", flipType) + 1;
              pool.dark = game.settings.get("starwarsffg", pointType) - 1;
            } else if (flipType == "dPoolDark") {
              pool.dark = game.settings.get("starwarsffg", flipType) + 1;
              pool.light = game.settings.get("starwarsffg", pointType) - 1;
            }
            await game.socket.emit("userActivity", game.user.id, { pool });
          }
          messageText = `Flipped a ${typeName} point.`;
        }
      } else if (add) {
        if (!game.user.isGM) {
          ui.notifications.warn("Only GMs can add or remove points from the Destiny Pool.");
          return;
        }
        const setting = game.settings.settings.get(`starwarsffg.${pointType}`);
        game.settings.set("starwarsffg", pointType, game.settings.get("starwarsffg", pointType) + 1);
        messageText = "Added a " + typeName + " point.";
      } else if (remove) {
        if (!game.user.isGM) {
          ui.notifications.warn("Only GMs can add or remove points from the Destiny Pool.");
          return;
        }
        const setting = game.settings.settings.get(`starwarsffg.${pointType}`);
        game.settings.set("starwarsffg", pointType, game.settings.get("starwarsffg", pointType) - 1);
        messageText = "Removed a " + typeName + " point.";
      }

      ChatMessage.create({
        user: game.user._id,
        content: messageText,
      });
    });

    if (game.user.isGM) {
      game.socket.on("userActivity", async (...args) => {
        if (args[1]?.pool) {
          CONFIG.logger.log("Received DestinyPool socket");
          CONFIG.logger.log(args[1].pool);
          game.settings.set("starwarsffg", "dPoolLight", args[1].pool.light);
          game.settings.set("starwarsffg", "dPoolDark", args[1].pool.dark);
        }
      });
    }
  }
}
