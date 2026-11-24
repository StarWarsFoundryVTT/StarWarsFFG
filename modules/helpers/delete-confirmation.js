const DELETE_CONTROLS = '.item-delete, .crew-delete, .remove-item, .flat_editor[data-action="delete"]';

export function confirmDeletes(element) {
  if (!element) return;
  element.addEventListener("click", async (event) => {
    const control = event.target.closest(DELETE_CONTROLS);
    if (!control || !element.contains(control) || event.shiftKey) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {title: game.i18n.localize("SWFFG.DeleteConfirm.Title")},
      content: `<p>${game.i18n.localize("SWFFG.DeleteConfirm.Body")}</p>`,
    });
    if (!confirmed) return;
    const replay = new MouseEvent("click", {bubbles: true, cancelable: true, shiftKey: true});
    event.target.dispatchEvent(replay);
  }, {capture: true});
}
