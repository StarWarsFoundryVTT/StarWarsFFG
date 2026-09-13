/** Critical tables carry this flag when shipped or imported from a compendium. */
export function isCriticalTable(table) {
  if (table.getFlag?.("starwarsffg", "criticalTable") === true) return true;
  // Compatibility with the first reference pack, published before the flag existed.
  const source = table.uuid ?? "";
  const original = table._stats?.compendiumSource ?? "";
  const reference = "Compendium.swffg-reference-tables-fr.tables.RollTable.1b76a8e54ab5851a";
  return source === reference || original === reference;
}

export async function drawCriticalTable(table) {
  const t = key => game.i18n.localize(`SWFFG.CriticalTable.${key}`);
  const vehicle = table.getFlag?.("starwarsffg", "criticalKind") === "vehicle";
  // Optional world-table labels: keep the shared critical-roll mechanics.
  const prompt = table.getFlag?.("starwarsffg", "criticalPrompt") ?? {};
  const escapeHTML = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const title = typeof prompt.title === "string" ? prompt.title : t(vehicle ? "VehicleTitle" : "Title");
  const hint = typeof prompt.hint === "string" ? escapeHTML(prompt.hint) : t(vehicle ? "VehicleHint" : "Hint");
  const rollLabel = typeof prompt.rollLabel === "string" ? prompt.rollLabel : t("Roll");
  const modifier = await foundry.applications.api.DialogV2.prompt({
    window: {title},
    classes: ["starwarsffg", "themed", "theme-light"],
    position: {width: 400},
    content: `<p>${hint}</p><div class="form-group"><label for="critical-roll-modifier">${t("Modifier")}</label><div class="form-fields"><input id="critical-roll-modifier" name="modifier" type="number" value="0" min="0" max="999899" step="1" required autofocus></div></div>`,
    ok: {
      label: rollLabel,
      icon: "fa-solid fa-dice-d20",
      callback: (_event, button) => Number(button.form.elements.modifier.value),
    },
    rejectClose: false,
  });
  // Closing the prompt must never perform a roll (zero is a valid modifier).
  if (modifier === null || modifier === undefined) return;
  if (!Number.isSafeInteger(modifier) || modifier < 0 || modifier > 999899) {
    ui.notifications.warn(t("Invalid"));
    return;
  }
  const roll = await new Roll("1d100 + @modifier", {modifier}).evaluate();
  // Use the supplied total without normalization, rerolls or changing the stored formula.
  const results = table.getResultsForRoll(roll.total);
  if (!results.length) {
    ui.notifications.warn(t("NoResult"));
    return;
  }
  return table.draw({roll, results});
}

export function registerCriticalTableRolls() {
  Hooks.on("renderRollTableSheet", (app, element) => {
    const referenceTable = app.document.getFlag?.('swffg-reference-tables-fr', 'table');
    if (['2-1', '2-6', '2-7', '2-8'].includes(referenceTable)) {
      for (const cell of element.querySelectorAll('table[data-results] tbody td.image')) {
        cell.style.alignSelf = 'center';
      }
    }
    if (!isCriticalTable(app.document)) return;
    decorateCriticalTable(app.document, element);
    const button = element.querySelector('button[data-action="drawResult"]');
    if (!button || button.dataset.ffgCriticalPrompt) return;
    button.dataset.ffgCriticalPrompt = "true";
    button.addEventListener("click", async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (button.disabled) return;
      button.disabled = true;
      try { await drawCriticalTable(app.document); }
      finally { button.disabled = false; }
    }, {capture: true});
  });
}

/** Change the view only: keep numeric ranges and the native edit form intact. */
export function decorateCriticalTable(table, element) {
  const grid = element.querySelector('table[data-results]');
  const heading = grid?.querySelector('thead th.details');
  if (!heading) return;
  const en = (table.getFlag?.('starwarsffg', 'language') ?? table.getFlag?.('swffg-reference-tables-fr', 'language')) === 'en';
  const labels = en ? ['—','Easy','Average','Hard','Daunting'] : ['—','Facile','Moyenne','Difficile','Intimidante'];
  function makeCell(tag, text) {
    const cell = element.ownerDocument.createElement(tag);
    cell.className = 'ffg-critical-severity';
    cell.style.cssText = 'flex:0 0 120px;padding:6px;white-space:normal;align-self:stretch';
    cell.textContent = text;
    return cell;
  }
  if (!heading.parentElement.querySelector('.ffg-critical-severity')) {
    const cell = makeCell('th', en ? 'Severity' : 'Gravité');
    cell.scope = 'col';
    heading.before(cell);
  }
  for (const row of grid.querySelectorAll('tbody tr[data-result-id]')) {
    const result = table.results.get(row.dataset.resultId);
    if (!result) continue;
    const imageCell = row.querySelector('td.image');
    if (imageCell) imageCell.style.alignSelf = 'center';
    const range = row.querySelector('td.range');
    if (range && result.range[1] === 999999) range.textContent = `${result.range[0]}+`;
    const details = row.querySelector('td.details');
    if (!details || row.querySelector('.ffg-critical-severity')) continue;
    const level = result.getFlag?.('starwarsffg', 'severity') ?? result.getFlag?.('swffg-reference-tables-fr', 'severity');
    const label = labels[level] ?? '—';
    const cell = makeCell('td', label);
    if (Number.isInteger(level) && level > 0 && level <= 4) {
      const dice = element.ownerDocument.createElement('span');
      dice.style.cssText = 'display:block;white-space:nowrap';
      for (let i = 0; i < level; i++) {
        const die = element.ownerDocument.createElement('img');
        die.src = 'systems/starwarsffg/images/dice/starwars/purple.png';
        die.alt = die.title = en ? 'Difficulty' : 'Difficulté';
        die.style.cssText = 'display:inline-block;width:20px;height:20px;max-width:none;border:0;margin:0 1px;vertical-align:middle;box-shadow:none';
        dice.append(die);
      }
      cell.append(dice);
    }
    details.before(cell);
  }
}
