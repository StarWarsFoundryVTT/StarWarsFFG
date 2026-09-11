import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

class DataFieldStub {
  constructor(fieldOrOptions = {}, options) {
    if (options) {
      this.element = fieldOrOptions;
      this.options = options;
    } else {
      this.options = fieldOrOptions;
    }
    Object.assign(this, this.options);
  }
}
class AnyField extends DataFieldStub {}
class ArrayField extends DataFieldStub {}
class BooleanField extends DataFieldStub {}
class HTMLField extends DataFieldStub {}
class NumberField extends DataFieldStub {}
class ObjectField extends DataFieldStub {}
class StringField extends DataFieldStub {}

globalThis.foundry = {
  abstract: { TypeDataModel: class TypeDataModel {} },
  data: { fields: { AnyField, ArrayField, BooleanField, HTMLField, NumberField, ObjectField, StringField } },
  utils: { deepClone: structuredClone },
};

const models = await import(new URL("../../modules/data-models/system-data-models.js", import.meta.url));

const actorTypes = ["character", "minion", "vehicle", "homestead", "rival", "nemesis"];
const itemTypes = [
  "ability", "armour", "career", "criticaldamage", "criticalinjury", "forcepower", "gear",
  "itemattachment", "itemmodifier", "talent", "shipattachment", "shipweapon", "homesteadupgrade",
  "signatureability", "specialization", "species", "weapon", "background", "obligation", "motivation",
];

test("registers a TypeDataModel for every declared Actor and Item type", () => {
  assert.deepEqual(Object.keys(models.actorDataModels), actorTypes);
  assert.deepEqual(Object.keys(models.itemDataModels), itemTypes);
  for (const model of [...Object.values(models.actorDataModels), ...Object.values(models.itemDataModels)]) {
    assert.ok(model.prototype instanceof foundry.abstract.TypeDataModel);
    assert.ok(Object.keys(model.defineSchema()).length > 0);
  }
});

test("preserves legacy defaults without sharing mutable values", () => {
  const first = models.getSystemDataDefaults("character");
  const second = models.getSystemDataDefaults("character");
  assert.equal(first.biography, "");
  assert.equal(first.stats.wounds.max, 0);
  assert.equal(first.skills["Ranged: Light"].characteristic, "Agility");
  first.stats.wounds.max = 99;
  assert.equal(second.stats.wounds.max, 0);

  const weapon = models.getSystemDataDefaults("weapon");
  assert.deepEqual(weapon.ammo, { max: 0, value: 0 });
  assert.equal(weapon.skill.value, "Ranged: Light");
});

test("uses typed root fields and keeps dynamic compatibility data optional", () => {
  const character = models.actorDataModels.character.defineSchema();
  assert.ok(character.biography instanceof HTMLField);
  assert.ok(character.stats instanceof ObjectField);
  assert.ok(character.skills instanceof ObjectField);
  assert.notStrictEqual(character.stats.initial(), character.stats.initial());
  assert.ok(character.skilltypes instanceof ArrayField);
  assert.equal(character.skilltypes.persisted, false);
  assert.ok(character.effects instanceof ArrayField);
  assert.equal(character.effects.persisted, false);

  const talent = models.itemDataModels.talent.defineSchema();
  assert.ok(talent.tier instanceof NumberField);
  assert.ok(talent.isForceTalent instanceof BooleanField);
  assert.ok(talent.trees instanceof ArrayField);
  assert.ok(talent.longDesc instanceof HTMLField);

  const weapon = models.itemDataModels.weapon.defineSchema();
  assert.ok(weapon.adjusteditemmodifier instanceof AnyField);
  assert.equal(weapon.adjusteditemmodifier.required, false);
  assert.equal(weapon.adjusteditemmodifier.initial, undefined);
});

test("rejects unknown importer document types", () => {
  assert.throws(() => models.getSystemDataDefaults("not-a-type"), /Unknown Star Wars FFG document type/);
});

test("manifest and importer use DataModels instead of template.json", async () => {
  const root = new URL("../../", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("system.json", root), "utf8"));
  assert.equal(manifest.type, "system");
  assert.deepEqual(manifest.compatibility, {minimum: 14, verified: 14, maximum: 14});
  assert.deepEqual(Object.keys(manifest.documentTypes.Actor), actorTypes);
  assert.deepEqual(Object.keys(manifest.documentTypes.Item), itemTypes);
  const importer = await readFile(new URL("modules/importer/import-helpers.js", root), "utf8");
  assert.doesNotMatch(importer, /fetch\(["']systems\/starwarsffg\/template\.json/);
  await assert.rejects(readFile(new URL("template.json", root), "utf8"), { code: "ENOENT" });
});
