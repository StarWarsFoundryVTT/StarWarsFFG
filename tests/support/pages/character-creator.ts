import type { Page } from '@playwright/test';
import { answerDialog, closeDialogs, waitForDialog } from '../api';

/**
 * The character creation wizard.
 */

const APP = '__qaCreator';

export async function open(page: Page): Promise<void> {
  await page.evaluate(async (key) => {
    const load = (path: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${path}`);
    const module = await load('helpers/character-creator.js');

    const app = new module.CharacterCreator();
    (window as any)[key] = app;
    await app.render(true);
  }, APP);
}

/**
 * Click a career in the wizard's own list and wait for the temp actor it rebuilds.
 */
export async function selectCareer(page: Page, careerUuid: string, timeout = 10_000): Promise<void> {
  const problem = await page.evaluate(async ({ key, careerUuid, timeout }) => {
    const app = (window as any)[key];
    if (!app) return 'the wizard is not open';

    const root = app.element;
    const control = root?.querySelector(`.career-spend[data-source="${careerUuid}"]`);
    if (!control) {
      const offered = [...(root?.querySelectorAll('.career-spend[data-source]') ?? [])]
        .map((el: any) => el.dataset.source).join(', ') || 'none';
      return `the wizard lists no career ${careerUuid}. It offers: ${offered}`;
    }
    control.click();

    // The click handler is async and nobody awaits it, so the temp actor arrives later.
    const deadline = Date.now() + timeout;
    while (!(app.tempActor && app.data?.selected?.career?.uuid === careerUuid)) {
      if (Date.now() > deadline) return 'the career was clicked but no temp actor followed';
      await new Promise((r) => setTimeout(r, 25));
    }
    return null;
  }, { key: APP, careerUuid, timeout });

  if (problem) throw new Error(`Selecting a career in the wizard failed: ${problem}`);
  await awaitRebuild(page);
}

/**
 * Choose the ruleset, which decides what a starting bonus is paid for in - conflict under Force
 * and Destiny, duty under Age of Rebellion, obligation under Edge of the Empire.
 */
export async function chooseRules(page: Page, rules: 'fad' | 'aor' | 'eote'): Promise<void> {
  const problem = await page.evaluate(({ key, rules }) => {
    const app = (window as any)[key];
    const radio = app?.element?.querySelector(`input[name="rules"][value="${rules}"]`);
    const group = app?.element?.querySelector('[data-action="selectRules"]');
    if (!radio || !group) return `the wizard offers no "${rules}" ruleset`;
    radio.checked = true;
    group.click();
    return null;
  }, { key: APP, rules });

  if (problem) throw new Error(`Choosing the ruleset failed: ${problem}`);
  await awaitRebuild(page);
}

/**
 * Take one of the starting bonuses on offer.
 */
export async function chooseStartingBonus(page: Page, choice: string): Promise<void> {
  const problem = await page.evaluate(({ key, choice }) => {
    const app = (window as any)[key];
    if (typeof app?.selectStartingBonus !== 'function') return 'the wizard is not open';
    app.selectStartingBonus(choice);
    return null;
  }, { key: APP, choice });

  if (problem) throw new Error(`Choosing a starting bonus failed: ${problem}`);
  await awaitRebuild(page);
}

/**
 * Buy something from the shop, by uuid.
 */
export async function buyGear(page: Page, itemUuid: string, timeout = 10_000): Promise<void> {
  const problem = await page.evaluate(async ({ key, itemUuid, timeout }) => {
    const app = (window as any)[key];
    if (!app) return 'the wizard is not open';

    const stocked = (app.compendiumData?.items ?? []) as any[];
    const wanted = stocked.find((item) => item.uuid === itemUuid);
    if (!wanted) {
      return `the shop does not stock ${itemUuid}. It stocks ${stocked.length} other items`;
    }

    /*
     * The shop shows one category at a time: each button above the table searches the hidden type
     * column for its own type and re-binds the row handlers (helpers/character-creator.js:366), so
     * an item is unreachable until its category is the one on show.
     */
    const category: Record<string, string> = {
      weapon: 'weapon',
      armour: 'armor',
      gear: 'gear',
      itemattachment: 'attachment',
      itemmodifier: 'mod',
    };
    const button = category[wanted.type]
      && app.element?.querySelector(`button.${category[wanted.type]}`);
    if (!button) return `the shop has no category to show a "${wanted.type}" in`;
    button.click();

    /*
     * Then the search box, because only a page of rows is in the DOM at a time. The table is built
     * from the ES module rather than as a jQuery plugin, so its API is not reachable from outside
     * and the box is the only way in.
     */
    const search = app.element?.querySelector(
      '#buy_gear_filter input, .dt-search input, #buy_gear_wrapper input[type="search"]',
    ) as HTMLInputElement | null;
    if (!search) return `the shop stocks "${wanted.name}" but has no search box to find it with`;

    search.value = wanted.name;
    search.dispatchEvent(new Event('input', { bubbles: true }));
    search.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

    const deadline = Date.now() + timeout;
    let control = app.element?.querySelector(`.credit-spend[data-source="${itemUuid}"]`);
    while (!control) {
      if (Date.now() > deadline) {
        const rows = app.element?.querySelectorAll('.credit-spend[data-source]').length ?? 0;
        return `searching for "${wanted.name}" left ${rows} rows, none of them it`;
      }
      await new Promise((r) => setTimeout(r, 50));
      control = app.element?.querySelector(`.credit-spend[data-source="${itemUuid}"]`);
    }
    control.click();
    return null;
  }, { key: APP, itemUuid, timeout });

  if (problem) throw new Error(`Buying gear in the wizard failed: ${problem}`);
  await awaitRebuild(page);
}

/** Put something back, by its name. */
export async function refundGear(page: Page, name: string): Promise<void> {
  const problem = await page.evaluate(({ key, name }) => {
    const app = (window as any)[key];
    const control = app?.element?.querySelector(`.credit-refund[data-name="${name}"]`);
    if (!control) {
      const bought = [...(app?.element?.querySelectorAll('.credit-refund[data-name]') ?? [])]
        .map((el: any) => el.dataset.name).join(', ') || 'none';
      return `nothing bought called "${name}". The basket holds: ${bought}`;
    }
    control.click();
    return null;
  }, { key: APP, name });

  if (problem) throw new Error(`Refunding gear in the wizard failed: ${problem}`);
  await awaitRebuild(page);
}

/**
 * What the wizard reckons the character can spend, has left, and keeps on top.
 */
export async function credits(
  page: Page,
): Promise<{ total: number; available: number; spending: number }> {
  const purse = await page.evaluate(async (key) => {
    const app = (window as any)[key];
    const calculated = app?.calcCredits();
    return calculated ? { ...calculated, spending: app.data?.spendingCredits } : null;
  }, APP);

  if (!purse) throw new Error('The wizard is not open.');
  return {
    total: Number(purse.total ?? 0),
    available: Number(purse.available ?? 0),
    spending: Number(purse.spending ?? 0),
  };
}

/** What the wizard reckons the character owes. */
export async function obligation(page: Page): Promise<{ total: number; available: number }> {
  const owed = await page.evaluate(async (key) => (window as any)[key]?.calcObligation() ?? null, APP);
  if (!owed) throw new Error('The wizard is not open.');
  return { total: Number(owed.total ?? 0), available: Number(owed.available ?? 0) };
}

/** What the wizard reckons has been earned and what is left to spend. */
export async function budget(page: Page): Promise<{ total: number; available: number }> {
  const xp = await page.evaluate((key) => (window as any)[key]?.calcXp() ?? null, APP);
  if (!xp) throw new Error('The wizard is not open.');
  return { total: Number(xp.total ?? 0), available: Number(xp.available ?? 0) };
}

/**
 * The uuid of the actor the wizard is previewing, once it is there to be read.
 */
export async function tempActor(page: Page, timeout = 10_000): Promise<string> {
  const uuid = await page.evaluate(async ({ key, timeout }) => {
    const app = (window as any)[key];
    const deadline = Date.now() + timeout;
    for (;;) {
      const preview = app?.tempActor;
      if (preview?.id && game.actors.get(preview.id)) return preview.uuid;
      if (Date.now() > deadline) return null;
      await new Promise((r) => setTimeout(r, 25));
    }
  }, { key: APP, timeout });

  if (!uuid) throw new Error('The wizard has no temp actor.');
  return uuid;
}

/** Whether the preview has one of the actor's skills marked as a career skill. */
export async function careerSkill(page: Page, skill: string): Promise<boolean | null> {
  return page.evaluate(({ key, skill }) => {
    const actor = (window as any)[key]?.tempActor;
    const entry = actor?.system?.skills?.[skill];
    return entry ? Boolean(entry.careerskill) : null;
  }, { key: APP, skill });
}

/**
 * Let the wizard finish rebuilding its preview.
 */
async function awaitRebuild(page: Page, timeout = 10_000): Promise<void> {
  await page.evaluate(async ({ key, timeout }) => {
    const app = (window as any)[key];
    const started = Date.now();
    const deadline = started + timeout;
    let seen = app?.tempActor?.id;
    let steadySince = started;

    for (;;) {
      const id = app?.tempActor?.id;
      if (id !== seen) {
        seen = id;
        steadySince = Date.now();
      }
      const live = Boolean(id && game.actors.get(id));
      if (live && Date.now() - steadySince > 250) return;
      // Nothing to wait for: choices made before a species or a career build no preview at all,
      // and waiting out the full timeout for one that is never coming costs seconds a test.
      if (!id && Date.now() - started > 750) return;
      if (Date.now() > deadline) return;
      await new Promise((r) => setTimeout(r, 50));
    }
  }, { key: APP, timeout });
}

/**
 * Choose a species from the wizard's own list.
 */
export async function selectSpecies(page: Page, speciesUuid: string, timeout = 10_000): Promise<void> {
  const problem = await page.evaluate(async ({ key, speciesUuid, timeout }) => {
    const app = (window as any)[key];
    if (!app) return 'the wizard is not open';

    const root = app.element;
    const control = root?.querySelector(`.species-spend[data-source="${speciesUuid}"]`);
    if (!control) {
      // Told apart deliberately: a species the wizard never gathered is a compendium problem,
      // while one gathered but not drawn is a rendering problem, and they read alike from outside.
      const gathered = (app.compendiumData?.availableSpecies ?? []) as any[];
      const listed = [...(root?.querySelectorAll('.species-spend[data-source]') ?? [])];
      return gathered.some((species) => species.uuid === speciesUuid)
        ? `the wizard gathered species ${speciesUuid} but drew ${listed.length} of ${gathered.length} rows`
        : `the wizard never gathered species ${speciesUuid}. It gathered ${gathered.length}: `
          + gathered.map((species) => species.name).join(', ');
    }
    control.click();

    const deadline = Date.now() + timeout;
    while (app.data?.selected?.species?.uuid !== speciesUuid) {
      if (Date.now() > deadline) return 'the species was clicked but never took';
      await new Promise((r) => setTimeout(r, 25));
    }
    return null;
  }, { key: APP, speciesUuid, timeout });

  if (problem) throw new Error(`Selecting a species in the wizard failed: ${problem}`);
  await awaitRebuild(page);
}

/**
 * Buy something through the XP-spend tab's pickers.
 */
async function buyFromPicker(
  page: Page, control: string, title: RegExp, name: string,
): Promise<void> {
  await page.evaluate(({ key, control }) => {
    (window as any)[key]?.element?.querySelector(control)?.click();
  }, { key: APP, control });

  await waitForDialog(page, { title });

  const problem = await page.evaluate((name) => {
    const select = document.querySelector('#ffgPurchase') as HTMLSelectElement | null;
    if (!select) return 'the dialog has no picker';

    const wanted = [...select.options].find((option) => option.textContent?.includes(name));
    if (!wanted) {
      const offered = [...select.options].map((option) => option.textContent?.trim()).join(', ');
      return `"${name}" is not on offer. It offers: ${offered || 'nothing'}`;
    }
    select.value = wanted.value;
    return null;
  }, name);

  if (problem) {
    await closeDialogs(page);
    throw new Error(`Buying "${name}" in the wizard failed: ${problem}`);
  }

  await answerDialog(page, 'done');
  await awaitRebuild(page);
}

/** Buy an extra specialization by name. */
export async function buySpecialization(page: Page, name: string): Promise<void> {
  await buyFromPicker(page, '.purchase-specialization', /specializations/i, name);
}

/** Buy a force power by name. */
export async function buyForcePower(page: Page, name: string): Promise<void> {
  await buyFromPicker(page, '.purchase-forcePower', /forcePowers/i, name);
}

/**
 * Buy an upgrade inside a force power that has been bought.
 */
export async function buyForcePowerUpgrade(
  page: Page, node: string, forcePowerName: string, timeout = 10_000,
): Promise<void> {
  const problem = await page.evaluate(async ({ key, node, forcePowerName, timeout }) => {
    const app = (window as any)[key];
    if (!app) return 'the wizard is not open';

    const selector = `.forcePower-talent-purchase[data-target="${node}"]`
      + `[data-forcepower="${forcePowerName}"]`;
    const deadline = Date.now() + timeout;

    let control = app.element?.querySelector(selector) as HTMLInputElement | null;
    while (!control) {
      if (Date.now() > deadline) {
        const offered = [...(app.element?.querySelectorAll('.forcePower-talent-purchase') ?? [])]
          .map((el: any) => `${el.dataset.forcepower}:${el.dataset.target}`).join(', ') || 'none';
        return `no upgrade "${node}" on "${forcePowerName}". It offers: ${offered}`;
      }
      await new Promise((r) => setTimeout(r, 25));
      control = app.element?.querySelector(selector) as HTMLInputElement | null;
    }

    control.checked = true;
    control.dispatchEvent(new Event('change', { bubbles: true }));

    const bought = () => (app.data?.purchases?.xp?.talents ?? [])
      .some((talent: any) => talent.key === node && talent.specName === forcePowerName);
    while (!bought()) {
      if (Date.now() > deadline) return `"${node}" was ticked but never reached the purchases`;
      await new Promise((r) => setTimeout(r, 25));
    }
    return null;
  }, { key: APP, node, forcePowerName, timeout });

  if (problem) throw new Error(`Buying a force power upgrade in the wizard failed: ${problem}`);
  await awaitRebuild(page);
}

/** Give back a force power that was bought, by its name. */
export async function removeForcePower(page: Page, name: string): Promise<void> {
  const problem = await page.evaluate(({ key, name }) => {
    const app = (window as any)[key];
    const control = app?.element?.querySelector(`.forcePower-remove[data-name="${name}"]`);
    if (!control) {
      const offered = [...(app?.element?.querySelectorAll('.forcePower-remove[data-name]') ?? [])]
        .map((el: any) => el.dataset.name).join(', ') || 'none';
      return `no bought force power called "${name}". It offers: ${offered}`;
    }
    control.click();
    return null;
  }, { key: APP, name });

  if (problem) throw new Error(`Removing a force power in the wizard failed: ${problem}`);
  await awaitRebuild(page);
}

/** Give back a specialization that was bought, by its name. */
export async function removeSpecialization(page: Page, name: string): Promise<void> {
  const problem = await page.evaluate(({ key, name }) => {
    const app = (window as any)[key];
    const control = app?.element?.querySelector(`.specialization-remove[data-name="${name}"]`);
    if (!control) {
      const offered = [...(app?.element?.querySelectorAll('.specialization-remove[data-name]') ?? [])]
        .map((el: any) => el.dataset.name).join(', ') || 'none';
      return `no bought specialization called "${name}". It offers: ${offered}`;
    }
    control.click();
    return null;
  }, { key: APP, name });

  if (problem) throw new Error(`Removing a specialization in the wizard failed: ${problem}`);
  await awaitRebuild(page);
}

/**
 * Buy a rank in a characteristic from the XP-spend tab.
 */
export async function buyCharacteristic(
  page: Page, characteristic: string, timeout = 10_000,
): Promise<void> {
  const problem = await page.evaluate(async ({ key, characteristic, timeout }) => {
    const app = (window as any)[key];
    if (!app) return 'the wizard is not open';

    const selector = '[data-action="characteristic-control"][data-direction="increase"]'
      + `[data-target="${characteristic}"]`;
    const deadline = Date.now() + timeout;

    let control = app.element?.querySelector(selector);
    while (!control) {
      if (Date.now() > deadline) {
        const offered = [...(app.element?.querySelectorAll(
          '[data-action="characteristic-control"][data-direction="increase"]') ?? [])]
          .map((el: any) => el.dataset.target).join(', ') || 'none';
        return `no rank to buy in "${characteristic}". It offers: ${offered}`;
      }
      await new Promise((r) => setTimeout(r, 25));
      control = app.element?.querySelector(selector);
    }
    control.click();

    const bought = () => (app.data?.purchases?.xp?.characteristics ?? [])
      .some((purchase: any) => purchase.key === characteristic);
    while (!bought()) {
      if (Date.now() > deadline) return `"${characteristic}" was clicked but never reached the purchases`;
      await new Promise((r) => setTimeout(r, 25));
    }
    return null;
  }, { key: APP, characteristic, timeout });

  if (problem) throw new Error(`Buying a characteristic in the wizard failed: ${problem}`);
  await awaitRebuild(page);
}

/**
 * Choose a specialization from the ones the selected career offers.
 */
export async function selectSpecialization(
  page: Page, specializationUuid: string, timeout = 10_000,
): Promise<void> {
  const problem = await page.evaluate(async ({ key, specializationUuid, timeout }) => {
    const app = (window as any)[key];
    if (!app) return 'the wizard is not open';

    const control = app.element?.querySelector(
      `.specialization-spend[data-source="${specializationUuid}"]`);
    if (!control) {
      const offered = (app.data?.available?.specializations ?? [])
        .map((spec: any) => spec.name).join(', ') || 'none';
      return `the career offers no specialization ${specializationUuid}. It offers: ${offered}`;
    }
    control.click();

    const deadline = Date.now() + timeout;
    while (app.data?.selected?.specialization?.uuid !== specializationUuid) {
      if (Date.now() > deadline) return 'the specialization was clicked but never took';
      await new Promise((r) => setTimeout(r, 25));
    }
    return null;
  }, { key: APP, specializationUuid, timeout });

  if (problem) throw new Error(`Selecting a specialization in the wizard failed: ${problem}`);
  await awaitRebuild(page);
}

/**
 * Buy a talent from the chosen specialization's tree.
 */
export async function buyTalent(page: Page, node: string, timeout = 10_000): Promise<void> {
  const problem = await page.evaluate(async ({ key, node, timeout }) => {
    const app = (window as any)[key];
    if (!app) return 'the wizard is not open';

    const deadline = Date.now() + timeout;
    const find = () => app.element?.querySelector(
      `.specialization-talent-purchase[data-target="${node}"]`) as HTMLInputElement | null;

    // Waited for: choosing a specialization records the choice and then re-renders, so the tree
    // is drawn a moment after the choice is made.
    let control = find();
    while (!control) {
      if (Date.now() > deadline) {
        const offered = [...(app.element?.querySelectorAll('.specialization-talent-purchase') ?? [])]
          .map((el: any) => el.dataset.target).join(', ') || 'none';
        return `the tree never offered a node "${node}". It offers: ${offered}`;
      }
      await new Promise((r) => setTimeout(r, 25));
      control = find();
    }

    control.checked = true;
    control.dispatchEvent(new Event('change', { bubbles: true }));

    // Purchases are recorded by node key - `{ specName, key, cost }` (:1465).
    const bought = () =>
      (app.data?.purchases?.xp?.talents ?? []).some((talent: any) => talent.key === node);
    while (!bought()) {
      if (Date.now() > deadline) return `"${node}" was ticked but never reached the purchases`;
      await new Promise((r) => setTimeout(r, 25));
    }
    return null;
  }, { key: APP, node, timeout });

  if (problem) throw new Error(`Buying a talent in the wizard failed: ${problem}`);
  await awaitRebuild(page);
}

/**
 * Take one of the free skill ranks a career or specialization grants.
 */
export async function takeSkillRank(
  page: Page, skill: string, mode: 'career' | 'specialization' = 'career', timeout = 10_000,
): Promise<void> {
  const problem = await page.evaluate(async ({ key, skill, mode, timeout }) => {
    const app = (window as any)[key];
    if (!app) return 'the wizard is not open';

    const selector = `[data-action="skill-control"][data-direction="increase"]`
      + `[data-target="${skill}"][data-mode="${mode}"]`;
    const control = app.element?.querySelector(selector);
    if (!control) {
      const offered = [...(app.element?.querySelectorAll(
        `[data-action="skill-control"][data-direction="increase"][data-mode="${mode}"]`) ?? [])]
        .map((el: any) => el.dataset.target).join(', ') || 'none';
      return `no ${mode} rank to take for "${skill}". It offers: ${offered}`;
    }
    control.click();

    const taken = () => (app.data?.selected?.[`${mode}CareerSkillRanks`] ?? []).includes(skill);
    const deadline = Date.now() + timeout;
    while (!taken()) {
      if (Date.now() > deadline) return `the ${mode} rank for "${skill}" was clicked but never took`;
      await new Promise((r) => setTimeout(r, 25));
    }
    return null;
  }, { key: APP, skill, mode, timeout });

  if (problem) throw new Error(`Taking a free skill rank in the wizard failed: ${problem}`);
  await awaitRebuild(page);
}

/**
 * Switch the wizard to one of its tabs.
 */
export async function showTab(page: Page, tab: string): Promise<void> {
  const problem = await page.evaluate(async ({ key, tab }) => {
    const app = (window as any)[key];
    if (!app) return 'the wizard is not open';

    if (typeof app.changeTab === 'function') {
      app.changeTab(tab, 'primary');
    } else {
      const link = app.element?.querySelector(`[data-tab="${tab}"]`);
      if (!link) return `the wizard has no "${tab}" tab`;
      link.click();
    }
    return null;
  }, { key: APP, tab });

  if (problem) throw new Error(`Switching the wizard to "${tab}": ${problem}`);
}

/**
 * Press the wizard's finish button and wait for the actor it makes.
 */
export async function finish(page: Page, timeout = 30_000): Promise<string> {
  const before = await page.evaluate(() => game.actors.map((actor: any) => actor.id));

  // The button lives on the review tab, and only the active tab is visible.
  await showTab(page, 'review');

  const create = page.locator('.create-actor').first();
  const ready = await create.waitFor({ state: 'visible', timeout: 5000 })
    .then(() => true).catch(() => false);
  if (!ready) throw new Error('The wizard shows no button to create the actor with.');

  await create.click();

  const uuid = await page.evaluate(async ({ before, timeout }) => {
    const deadline = Date.now() + timeout;
    let made: any = null;
    while (!made) {
      made = game.actors.find((actor: any) => !before.includes(actor.id));
      if (!made && Date.now() > deadline) return null;
      if (!made) await new Promise((r) => setTimeout(r, 50));
    }

    /*
     * The actor exists well before the wizard has finished with it: `createActor` goes on to add
     * items and to write credits, obligation and career skills, each in its own update.
     * Waiting for the document to stop changing is what makes reading it afterward mean anything.
     */
    let held = JSON.stringify(made.toObject());
    let still = 0;
    while (still < 400 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
      const now = JSON.stringify(made.toObject());
      if (now === held) still += 50;
      else {
        held = now;
        still = 0;
      }
    }

    return made.uuid;
  }, { before, timeout });

  if (!uuid) throw new Error('The wizard made no actor.');
  return uuid;
}

export async function close(page: Page): Promise<void> {
  await page.evaluate(async (key) => {
    const app = (window as any)[key];
    delete (window as any)[key];
    await app?.close();
  }, APP);
}
