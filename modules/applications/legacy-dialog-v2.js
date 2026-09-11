const { DialogV2 } = foundry.applications.api;

/** DialogV2 bridge for the system's existing dialog configurations. */
export class LegacyDialogV2 extends DialogV2 {
  constructor(config={}, options={}) {
    const content = document.createElement("div");
    content.innerHTML = config.content ?? "";
    const buttons = Object.entries(config.buttons ?? {})
      .filter(([, button]) => button.condition !== false)
      .map(([action, button]) => ({
        action,
        label: button.label ?? action,
        icon: LegacyDialogV2._iconClass(button.icon),
        default: config.default === action,
        callback: async (event, _button, dialog) => button.callback?.($(dialog.element), event),
      }));
    if (!buttons.length) buttons.push({ action: "close", label: "Close", default: true });

    super({
      ...options,
      window: {
        ...(options.window ?? {}),
        title: config.title ?? options.title ?? "",
      },
      position: {
        ...(options.position ?? {}),
        ...Object.fromEntries(["width", "height", "top", "left"]
          .filter(key => options[key] !== undefined)
          .map(key => [key, options[key]])),
      },
      content,
      buttons,
      form: {
        ...(options.form ?? {}),
        closeOnSubmit: true,
      },
      modal: options.modal ?? false,
    });
    this._legacyConfig = config;
  }

  static _iconClass(icon="") {
    return icon.match(/class=["']([^"']+)/)?.[1] ?? icon;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    return this._legacyConfig.render?.($(this.element));
  }

  _onClose(options) {
    this._legacyConfig.close?.($(this.element));
    return super._onClose(options);
  }

  render(force={}, options={}) {
    if (typeof force === "boolean") return super.render({ ...options, force });
    return super.render(force ?? {});
  }
}
