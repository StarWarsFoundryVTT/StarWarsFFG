/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class ItemFFG extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    // Get the Item's data
    const itemData = this.data;
    const actorData = this.actor ? this.actor.data : {};
    const data = itemData.data;

    itemData.safe_desc = data.description.replace(/(<([^>]+)>)/gi, "");

    // perform localisation of dynamic values
    switch (this.type) {
      case "weapon":
        const rangeId = `SWFFG.WeaponRange${this._capitalize(data.range.value)}`;
        data.range.label = rangeId;
        break;
      case "shipweapon":
        const vehiclerangeId = `SWFFG.VehicleRange${this._capitalize(data.range.value)}`;
        data.range.label = vehiclerangeId;
        const firingarcId = `SWFFG.VehicleFiringArc${this._capitalize(data.firingarc.value)}`;
        data.firingarc.label = firingarcId;
        break;
      case "talent":
        const cleanedActivationName = data.activation.value.replace(/[\W_]+/g, "");
        const activationId = `SWFFG.TalentActivations${this._capitalize(cleanedActivationName)}`;
        data.activation.label = activationId;
        break;
      default:
    }
  }
  /**
   * Capitalize string
   * @param  {String} s   String value to capitalize
   */
  _capitalize(s) {
    if (typeof s !== "string") return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
