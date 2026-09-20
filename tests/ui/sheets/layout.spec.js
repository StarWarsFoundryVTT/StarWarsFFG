import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * Whether a sheet's panes end where the window does.
 */

/** What the characteristics tab shows, measured against the edge the form clips at. */
async function characteristicsTab(page, id) {
  return page.evaluate((id) => {
    const form = document.getElementById(id).querySelector('form');
    const skills = form.querySelector('.skillsTablesGrid');
    skills.scrollTop = skills.scrollHeight;
    const edge = form.getBoundingClientRect().bottom;
    const paneTop = skills.getBoundingClientRect().top;
    const scrolledTo = [...form.querySelectorAll('.skillsTablesGrid .skill')]
      .filter((row) => row.getBoundingClientRect().top >= paneTop - 1);
    return {
      clippedByForm: form.scrollHeight - form.clientHeight,
      unreachableSkills: scrolledTo
        .filter((row) => row.getBoundingClientRect().bottom > edge)
        .map((row) => row.dataset.ability),
    };
  }, id);
}

/**
 * Grow the header the way a character with several specializations or force powers does - every
 * one of those is a pill, and enough of them wrap onto another line.
 */
async function growHeader(page, id, px) {
  await page.evaluate(({ id, px }) => {
    const pad = document.createElement('div');
    pad.style.cssText = `height:${px}px;width:100%;flex:0 0 ${px}px`;
    document.getElementById(id).querySelector('form .header-fields').append(pad);
  }, { id, px });
}

/** Which tab bodies the sheet is currently drawing. */
async function visibleTabs(page, id) {
  return page.evaluate((id) => [...document.getElementById(id)
    .querySelectorAll('form .sheet-body > .tab')]
    .filter((tab) => getComputedStyle(tab).display !== 'none')
    .map((tab) => tab.dataset.tab), id);
}

test('#1737 the character sheet keeps every skill inside the window', async ({ world, page }) => {
  const character = await world.actor({ actor: 'character' });
  const id = await api.openSheet(page, character);

  const asOpened = await characteristicsTab(page, id);

  expect(asOpened.clippedByForm, 'the sheet body fits the form it sits in').toBe(0);
  expect(asOpened.unreachableSkills, 'and the skill list bottoms out on screen').toEqual([]);

  await growHeader(page, id, 60);
  const withPills = await characteristicsTab(page, id);

  expect(withPills.clippedByForm, 'a taller header still fits').toBe(0);
  expect(withPills.unreachableSkills, 'and costs no skills').toEqual([]);
});

test('the character sheet draws one tab at a time', async ({ world, page }) => {
  const character = await world.actor({ actor: 'character' });
  const id = await api.openSheet(page, character);

  expect(await visibleTabs(page, id), 'the sheet opens on characteristics').toEqual(['characteristics']);

  await page.locator(`#${id} nav.sheet-tabs [data-tab="talents"]`).click();

  expect(await visibleTabs(page, id), 'and switching tabs leaves only that one').toEqual(['talents']);
});
