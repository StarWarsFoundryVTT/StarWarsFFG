const PauseClass = foundry?.applications?.ui?.GamePause || Pause;

export default class PauseFFG extends PauseClass {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = "pause";
    options.template = "systems/starwarsffg/templates/parts/ffg-paused.html";
    options.popOut = false;
    return options;
  }

  getData() {
    let icon = game.settings.get("starwarsffg", "ui-pausedImage");
    if (icon?.length <= 0) {
      icon = "icons/svg/clockwork.svg";
    }

    return {
      paused: game.paused,
      icon,
    };
  }
}
