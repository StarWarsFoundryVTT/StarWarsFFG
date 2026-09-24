import { attributes, biography, metaOnly, threshold } from "./_templates.js";
import { embeddedItems, keyedMap, numberStat } from "../fields.js";

const fields = foundry.data.fields;

const num = (initial = 0) => new fields.NumberField({ required: true, nullable: false, initial: initial });
const label = (text) => new fields.StringField({ required: true, initial: text });

export class VehicleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...biography(),
      ...attributes(),
      ...metaOnly(),
      stats: new fields.SchemaField({
        silhouette: numberStat({ initial: 1, label: "Silhouette", adjusted: false }),
        speed: new fields.SchemaField({
          value: num(), max: num(), type: label("Number"), label: label("Speed"),
        }),
        handling: numberStat({ label: "Handling", adjusted: false }),
        // a vehicle's tracks carry a label rather than an adjusted value
        hullTrauma: new fields.SchemaField({
          value: num(), min: num(), max: num(10), label: label("Hull Trauma"),
        }),
        systemStrain: new fields.SchemaField({
          value: num(), min: num(), max: num(10), label: label("System Strain"),
        }),
        shields: new fields.SchemaField({
          fore: num(), port: num(), starboard: num(), aft: num(), label: label("Shields"),
        }),
        armour: numberStat({ label: "Armour" }),
        sensorRange: new fields.SchemaField({
          value: new fields.StringField({ required: true, blank: true, initial: "Short" }),
          type: label("String"),
        }),
        // crew is held in a flag; this has always been an empty object
        crew: keyedMap(),
        passengerCapacity: numberStat({ label: "Passenger Capacity", adjusted: false }),
        encumbrance: threshold({ max: 10 }),
        cost: numberStat({ label: "Cost" }),
        rarity: new fields.SchemaField({
          value: num(),
          isrestricted: new fields.BooleanField({ required: true, initial: false }),
          type: label("Number"), label: label("Rarity"), adjusted: num(),
        }),
        customizationHardPoints: numberStat({ label: "Hard Points" }),
        hyperdrive: new fields.SchemaField({
          value: num(1), type: label("Number"), label: label("SWFFG.Hyperdrive"),
          // edited by the sheet, never declared in template.json
          backup: num(),
        }),
        consumables: new fields.SchemaField({
          value: num(1),
          duration: new fields.StringField({ required: true, initial: "months" }),
          type: label("Number"), label: label("SWFFG.Consumables"),
        }),
        navicomputer: new fields.SchemaField({
          value: new fields.BooleanField({ required: true, initial: false }),
          type: label("Boolean"), label: label("SWFFG.VehicleNavicomputer"),
        }),
      }),
      // written onto the vehicle itself by importers/vehicles.js:101
      itemmodifier: embeddedItems(),
      itemattachment: embeddedItems(),
      spaceShip: new fields.BooleanField({ required: true, initial: false }),
      silhouetteImage: new fields.StringField({
        required: true, initial: "systems/starwarsffg/images/shipdefence.png",
      }),
    };
  }
}
