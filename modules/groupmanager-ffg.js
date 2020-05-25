export class GroupManagerLayer extends TokenLayer {
  constructor() {
    super();
  }

  static get layerOptions() {
    return mergeObject(super.layerOptions, {
      canDragCreate: false,
    });
  }
  /* -------------------------------------------- */
  /*  Methods
  /* -------------------------------------------- */

  activate() {
    super.activate();
  }

  deactivate() {
    super.deactivate();
  }

  async draw() {
    super.draw();
  }

  /* -------------------------------------------- */
}

export class GroupManager extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["form", "groupmanager", "sidebar-popout"],
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: true,
      popOut: true,
      editable: game.user.isGM,
      width: 300,
      height: 450,
      template: "systems/starwarsffg/templates/group-manager.html",
      id: "group-manager",
      title: "Group Manager",
    });
  }

  /* -------------------------------------------- */

  /**
   * Obtain module metadata and merge it with game settings which track current module visibility
   * @return {Object}   The data provided to the template when rendering the form
   */
  getData() {
    // Return data to the template
    return {};
  }

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  _updateObject(event, formData) {
    return formData;
  }
}
