import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';
import * as oggdude from '../../support/oggdude';

/**
 * What the importer produced, judged against the XML it read.
 */

test('imported armour carries the soak and defence from its XML', async ({ world, page }) => {
  const source = await oggdude.record(page, 'Armor.xml', 'ARMROBE');
  const armour = await world.imported('armour');

  expect(await api.read(page, armour, 'system.soak.value'), 'the soak the XML names').toBe(Number(source.Soak));
  expect(await api.read(page, armour, 'system.defence.value'), 'and its defence').toBe(Number(source.Defense));
});

test.fixme("imported armour's inherent effect holds those same values", async ({ world, page }) => {
  const source = await oggdude.record(page, 'Armor.xml', 'ARMROBE');
  const armour = await world.imported('armour');

  const effects = await api.readItemEffects(page, armour);
  const inherent = effects.find((effect) => effect.name === '(inherent)');

  expect(inherent, 'the import built one').toBeTruthy();

  const changes = Object.fromEntries(inherent.changes.map((change) => [change.key, change.value]));

  // FIXME: #2312
  expect(Number(changes['system.stats.soak.value']), 'the soak it will grant').toBe(Number(source.Soak));
  expect(Number(changes['system.stats.defence.melee']), 'its defence in melee').toBe(Number(source.Defense));
  expect(Number(changes['system.stats.defence.ranged']), 'and at range').toBe(Number(source.Defense));
});

test('an imported attachment carries the BaseMods named in its XML', async ({ world, page }) => {
  const source = await oggdude.record(page, 'ItemAttachments.xml', 'SES');
  const attachment = await world.imported('itemattachment', 'SES');

  const attributes = await api.read(page, attachment, 'system.attributes');
  const carried = Object.values(attributes ?? {});

  expect(carried, 'one base mod in, one out').toHaveLength(1);
  expect(carried[0].mod, 'the characteristic the XML names').toBe('Brawn');
  expect(carried[0].modtype, 'as a characteristic rather than a stat').toBe('Characteristic');
  expect(Number(carried[0].value), 'by its count').toBe(Number(source.BaseMods.Mod.Count));
});

test('an imported attachment carries its AddedMods as Modifications', async ({ world, page }) => {
  const source = await oggdude.record(page, 'ItemAttachments.xml', 'ARMINS');
  const soak = await oggdude.record(page, 'ItemDescriptors.xml', 'SOAKADD');
  const defence = await oggdude.record(page, 'ItemDescriptors.xml', 'DEFADD');
  const attachment = await world.imported('itemattachment');

  const modifications = await api.read(page, attachment, 'system.itemmodifier');
  const names = modifications.map((mod) => mod.name);

  expect(names, 'one Modification per added mod').toEqual([soak.Name, defence.Name, 'Unique Mod 1']);
  expect(Number(modifications[0].system.rank), 'ranked by its count').toBe(Number(source.AddedMods.Mod[0].Count));
});

test('a modifier referenced by Key resolves to the descriptor it names', async ({ world, page }) => {
  const source = await oggdude.record(page, 'Weapons.xml', 'BRASS');
  const quality = source.Qualities.Quality.find((entry) => entry.Key === 'PIERCE');
  const weapon = await world.imported('weapon', 'BRASS');
  const descriptor = await world.imported('itemmodifier');

  const carried = await api.read(page, weapon, 'system.itemmodifier');
  const pierce = carried.find((mod) => mod.flags?.starwarsffg?.ffgimportid === quality.Key);

  expect(pierce, 'the quality the weapon names is on it').toBeTruthy();
  expect(pierce.name, 'as the descriptor it names').toBe(await api.read(page, descriptor, 'name'));
  expect(Number(pierce.system.rank), 'ranked by the count in the XML').toBe(Number(quality.Count));
});

test('imported talents carry their ranked flag', async ({ world, page }) => {
  const grit = await oggdude.record(page, 'Talents.xml', 'GRIT');
  const quick = await oggdude.record(page, 'Talents.xml', 'QUICKDR');

  const ranked = await world.imported('talent');
  const unranked = await world.imported('talent', 'QUICKDR');

  expect(await api.read(page, ranked, 'system.ranks.ranked'), 'ranked in the XML').toBe(grit.Ranked === 'true');
  expect(await api.read(page, unranked, 'system.ranks.ranked'), 'and not').toBe(quick.Ranked === 'true');
});

test('an imported species carries its characteristics and thresholds', async ({ world, page }) => {
  const source = await oggdude.record(page, 'Species/Kaminoan.xml', 'KAMINOAN');
  const thresholds = source.StartingAttrs;
  const species = await world.imported('species');

  const attributes = await api.read(page, species, 'system.attributes');
  const expected = Object.fromEntries(
    Object.entries(source.StartingChars).map(([name, value]) => [name, Number(value)]));
  const carried = Object.fromEntries(
    Object.keys(expected).map((name) => [name, Number(attributes[name]?.value)]));

  expect(carried, 'every characteristic the XML gives it').toEqual(expected);
  expect(Number(attributes.Wounds.value), 'the wound threshold').toBe(Number(thresholds.WoundThreshold));
  expect(Number(attributes.Strain.value), 'and the strain').toBe(Number(thresholds.StrainThreshold));

  const startingXP = await api.read(page, species, 'system.startingXP');

  expect(startingXP, 'with the XP it starts on').toBe(Number(thresholds.Experience));
});

test('importing the same data twice does not duplicate the documents', async ({ page }) => {
  const before = await api.readPack(page, 'oggdude.Armor');

  expect(before, 'the seed put the armour there').not.toHaveLength(0);

  await oggdude.reimport(page, 'Armor');

  const after = await api.readPack(page, 'oggdude.Armor');
  const keys = (docs) => docs.map((doc) => doc.importId).sort();
  const ids = (docs) => docs.map((doc) => doc.id).sort();

  expect(keys(after), 'the same records, once each').toEqual(keys(before));
  expect(ids(after), 'in the same documents').toEqual(ids(before));
});

test('#2201 a die modifier keeps the effect that carries it across a re-import', async ({ world, page }) => {
  const species = await world.imported('species', 'CHADRA');

  await oggdude.reimport(page, 'Species');

  const again = await world.imported('species', 'CHADRA');
  const carried = await api.readModifierEffects(page, again);

  expect(again, 'the same document, not a second copy').toBe(species);
  expect(carried.orphaned, 'no effect is left naming a modifier that is gone').toEqual([]);
  expect(
    carried.effects.filter((effect) => effect.keys.includes('system.skills.Perception.remsetback')),
    'and the one that removes setbacks is applied once'
  ).toHaveLength(1);
});

test.fixme('an item whose XML names an unknown skill is skipped, and says so', async ({ page, consoleGuard }) => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<Gears>
  <Gear>
    <Key>QAUNKNOWN</Key>
    <Name>QA Field Kit</Name>
    <Description>Gear whose base mod names a skill that does not exist.</Description>
    <Price>100</Price>
    <Encumbrance>1</Encumbrance>
    <Rarity>1</Rarity>
    <Type>Medical</Type>
    <BaseMods>
      <Mod>
        <MiscDesc>Grants a boost to a skill nobody has.</MiscDesc>
        <Count>1</Count>
        <DieModifiers>
          <DieModifier>
            <SkillKey>QANOSUCHSKILL</SkillKey>
            <BoostCount>1</BoostCount>
          </DieModifier>
        </DieModifiers>
      </Mod>
    </BaseMods>
  </Gear>
</Gears>`;

  consoleGuard.allow(/Error importing record/);

  const complaints = await oggdude.runImport(page, 'Gear', xml, { file: 'Gear.xml' });
  const imported = await api.findImported(page, 'oggdude.Gear', 'QAUNKNOWN');

  // FIXME: no ticket number since this is really an enhancement
  expect(imported, 'the gear is not in the pack').toBeNull();
  expect(complaints.join(' | '), 'and the importer said so rather than failing quietly').toContain(
    'Error importing record');
});

// Open bugs at the time of writing tests

test.fixme("#1722 an unsupported species feature does not create a dummy modifier", async ({ world, page }) => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<Species>
  <Key>QABLIND</Key>
  <Name>QA Blind</Name>
  <Description>A species whose trait upgrades the difficulty of combat checks.</Description>
  <StartingChars>
    <Brawn>2</Brawn>
    <Agility>2</Agility>
    <Intellect>2</Intellect>
    <Cunning>2</Cunning>
    <Willpower>2</Willpower>
    <Presence>2</Presence>
  </StartingChars>
  <StartingAttrs>
    <WoundThreshold>10</WoundThreshold>
    <StrainThreshold>10</StrainThreshold>
    <Experience>100</Experience>
  </StartingAttrs>
  <OptionChoices>
    <OptionChoice>
      <Key>QABLINDOC1</Key>
      <Name>Blind</Name>
      <Options>
        <Option>
          <Key>QABLINDOC1OP1</Key>
          <Name>Blind</Name>
          <Description>Upgrade the difficulty of all combat checks twice.</Description>
          <DieModifiers>
            <DieModifier>
              <SkillType>Combat</SkillType>
              <UpgradeDifficultyCount>2</UpgradeDifficultyCount>
            </DieModifier>
          </DieModifiers>
        </Option>
      </Options>
    </OptionChoice>
  </OptionChoices>
</Species>`;

  await oggdude.runImport(page, 'Species', xml, { file: 'Species/QABlind.xml', dir: true });

  const species = await api.findImported(page, 'oggdude.Species', 'QABLIND');

  expect(species, 'the species imported').toBeTruthy();

  world.track(species);

  const attributes = await api.read(page, species, 'system.attributes');
  const beyondTheBasics = Object.values(attributes ?? {})
    .filter((attr) => !['Characteristic', 'Stat'].includes(attr.modtype));

  // FIXME: #1722
  expect(beyondTheBasics, 'the modifier it could not read is left out').toEqual([]);
});
