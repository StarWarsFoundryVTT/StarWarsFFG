import type { Locator, Page } from '@playwright/test';
import { answerDialog } from '../api';

/**
 * Reads from the rendered combat tracker.
 *
 * Open it with `api.openCombatTracker` first
 */

/** Which side a slot belongs to, as the template spells it. */
export type Side = 'Friendly' | 'Enemy' | 'Neutral' | 'Secret';

const TRACKER = '#combat-tracker';

/** Every slot in the encounter. */
export function slots(page: Page): Locator {
  return page.locator(`${TRACKER} li.combatant[data-slot-index]`);
}

/** The slots on one side. */
export function slotsFor(page: Page, side: Side): Locator {
  return page.locator(`${TRACKER} li.combatant[data-disposition="${side}"]`);
}

/** Slots someone has taken for this round. */
export function claimedSlots(page: Page): Locator {
  return page.locator(`${TRACKER} li.combatant[data-slot-index].claimed`);
}

/**
 * Slots the side can no longer fill - more slots than live combatants.
 */
export function unusedSlots(page: Page): Locator {
  return page.locator(`${TRACKER} li.combatant[data-slot-index].slot-unused-true`);
}

/** Slots still going spare. */
export function unclaimedSlots(page: Page): Locator {
  return page.locator(`${TRACKER} li.combatant[data-slot-index]:not(.claimed)`);
}

/**
 * A control from the tracker's footer: the turn and round arrows, and ending the encounter.
 */
export function control(
  page: Page,
  action: 'nextTurn' | 'previousTurn' | 'nextRound' | 'previousRound' | 'endCombat' | 'startCombat',
): Locator {
  return page.locator(`[data-action="${action}"]`);
}

/** The slot offering the claim link - the one whose turn it is. */
export function claimableSlot(page: Page): Locator {
  return page.locator(`${TRACKER} li.combatant[data-slot-index]:has(a[data-claim-slot])`);
}

/**
 * The "claim slot" link.
 */
export function claimControl(page: Page): Locator {
  return page.locator(`${TRACKER} a[data-claim-slot]`);
}

/**
 * The header control that adds a slot by hand.
 */
export function addSlotControl(page: Page): Locator {
  return page.locator('[data-action="addInitiativeSlot"]');
}

/**
 * Correct a slot's initiative by hand, through the menu entry and the dialog it raises.
 */
export async function setSlotInitiative(
  page: Page, slot: Locator, initiative: number,
): Promise<void> {
  await chooseSlotMenuEntry(page, slot, SLOT_MENU.updateInitiative);
  const dialog = page.locator('.window-app.dialog').last();
  await dialog.locator('#initiative').fill(String(initiative));
  await answerDialog(page, 'submit');
}

/** The radio the add-slot dialog offers for each side. It has no Secret. */
const SIDE_RADIO: Partial<Record<Side, string>> = {
  Friendly: 'friendly',
  Neutral: 'neutral',
  Enemy: 'enemy',
};

/**
 * Add a slot by hand: the header control, and the dialog it raises.
 */
export async function addSlot(
  page: Page, { side, initiative }: { side: Side; initiative: number },
): Promise<void> {
  const radio = SIDE_RADIO[side];
  if (!radio) throw new Error(`The add-slot dialog does not offer "${side}".`);

  await addSlotControl(page).click();

  // Scoped to the dialog: it names its fields by id, and nothing keeps those unique on the page.
  const dialog = page.locator('.window-app.dialog').last();
  await dialog.locator('#initiative').fill(String(initiative));
  await dialog.locator(`#${radio}`).check();
  await answerDialog(page, 'submit');
}

/**
 * The entries in a slot's right-click menu, as rendered.
 */
export const SLOT_MENU = {
  updateInitiative: 'Update Initiative',
  clearInitiative: 'Clear Initiative',
  removeCombatant: 'Remove Participant',
  removeSlot: 'Remove Initiative Slot',
  unclaim: 'Un-claim Initiative Slot',
} as const;

/**
 * The tracker's right-click menu. In v13 it is a `<dialog id="menu">`; the older selectors are
 * kept so the helper is not pinned to one Foundry version.
 */
const MENU = 'dialog#menu, #context-menu, .context-menu, nav.context-menu';

/**
 * Shut any open context menu.
 */
export async function dismissSlotMenu(page: Page): Promise<void> {
  await page.evaluate((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      const dialog = element as HTMLDialogElement;
      if (typeof dialog.close === 'function') dialog.close();
      else element.remove();
    });
  }, MENU);
}

/**
 * Right-click a slot to open the tracker's context menu, and pick an entry from it by label.
 */
export async function chooseSlotMenuEntry(page: Page, slot: Locator, label: string): Promise<void> {
  let offered: string[] = [];

  for (let attempt = 0; attempt < 3; attempt++) {
    await dismissSlotMenu(page);

    // The right-click is a real one - only that opens the menu.
    await slot.click({ button: 'right' });

    /*
     * The entry is then chosen in the page. The tracker re-renders underneath while the menu is
     * up, which rebuilds it, and a locator click cannot survive its target being detached between
     * the actionability check and the click itself. Hit-testing is not what is under test here.
     */
    const result = await page.evaluate(({ selector, label }) => {
      const menu = document.querySelector(selector);
      if (!menu) return { clicked: false, offered: [] as string[] };

      const items = [...menu.querySelectorAll('li, .context-item, button')] as HTMLElement[];
      const offered = items.map((item) => (item.textContent ?? '').trim()).filter(Boolean);
      const wanted = items.find(
        (item) => (item.textContent ?? '').trim().toLowerCase().includes(label.toLowerCase()));

      wanted?.click();
      return { clicked: Boolean(wanted), offered };
    }, { selector: MENU, label });

    offered = result.offered;
    if (result.clicked) {
      await dismissSlotMenu(page);
      return;
    }
  }

  await dismissSlotMenu(page);
  throw new Error(
    `The slot menu has no "${label}" entry. It offers: ${[...new Set(offered)].join(' | ') || 'nothing'}`,
  );
}

/** The slot on offer, as a slot id, or null when nothing is. */
export async function claimableSlotId(page: Page): Promise<string | null> {
  const slot = claimableSlot(page);
  return (await slot.count()) ? slot.getAttribute('data-alt-id') : null;
}

/**
 * The initiative on a slot, or null where none has been rolled - an unrolled slot renders the
 * attribute empty rather than leaving it off.
 */
export async function initiativeOf(slot: Locator): Promise<number | null> {
  const value = await slot.getAttribute('data-initiative');
  return value ? Number(value) : null;
}

/**
 * The id of the combatant each slot belongs to, in the order they are listed.
 */
export async function slotIds(page: Page): Promise<string[]> {
  return slots(page).evaluateAll((rows) =>
    rows.map((row) => (row as HTMLElement).dataset.altId ?? ''));
}

/** Every slot's initiative, in the order the tracker lists them. */
export async function initiatives(page: Page): Promise<(number | null)[]> {
  return slots(page).evaluateAll((rows) =>
    rows.map((row) => {
      const value = (row as HTMLElement).dataset.initiative;
      return value ? Number(value) : null;
    }));
}
