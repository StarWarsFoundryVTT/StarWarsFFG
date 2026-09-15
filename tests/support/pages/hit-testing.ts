import type { Locator } from '@playwright/test';

/**
 * Whether anything is layered over a control, and what.
 */
export async function covering(control: Locator): Promise<string | null> {
  return control.evaluate((el) => {
    const { x, y, width, height } = el.getBoundingClientRect();
    const top = document.elementFromPoint(x + width / 2, y + height / 2);
    if (!top || top === el || el.contains(top)) return null;
    const name = typeof top.className === 'string' ? top.className.trim() : '';
    return `${name || top.tagName.toLowerCase()}: "${(top.textContent ?? '').trim().slice(0, 40)}"`;
  });
}
