export default class PauseFFG extends Pause {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = "pause";
    options.template = "systems/genesysk2/templates/parts/ffg-paused.html";
    options.popOut = false;
    return options;
  }

  getData() {
    let icon = game.settings.get("genesysk2", "ui-pausedImage");
    if (icon?.length <= 0) {
      icon = "icons/svg/clockwork.svg";
    }

    return {
      paused: game.paused,
      icon,
    };
  }
}
