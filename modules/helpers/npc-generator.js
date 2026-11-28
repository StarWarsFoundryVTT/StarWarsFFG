import {
  SECTIONS, characteristics, createActor, generate, loadContent, newSeed, regenerate, reroll, skillDice,
} from "./npc-generator-engine.js";
import { constants } from "../config/ffg-npc-generator.js";
import { explainModifier, listPresets } from "./npc-generator-presets.js";
import { DicePoolFFG } from "../dice/pool.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const PREFIX = "SWFFG.NpcGenerator.App";
/** What the GM can limit by tag in the window: species and each kind of item */
const FILTERS = ["species", ...constants.itemTypes];

/** An item's stats for the gear list */
export async function describeItem(doc) {
  const t = (key) => game.i18n.localize(key);
  const system = doc.system;
  const stats = [];
  const add = (label, value, summary = false) => {
    if (value !== undefined && value !== null && value !== "") stats.push({ label: t(label), value, summary });
  };
  if (doc.type === "weapon") {
    const skill = system.skill?.value;
    const range = system.range?.value;
    // a Brawn weapon's damage is added to the wielder's Brawn
    add("SWFFG.ItemsDamage", system.skill?.useBrawn ? `+${system.damage?.value}` : system.damage?.value, true);
    add("SWFFG.ItemsCrit", system.crit?.value, true);
    add("SWFFG.ItemsRange", t(CONFIG.FFG.ranges[range]?.label ?? range), true);
    stats.push({ label: t("SWFFG.ItemsSkill"), value: t(CONFIG.FFG.skills[skill]?.label ?? skill), skill: skill });
  }
  if (doc.type === "armour") {
    add("SWFFG.ItemsSoak", system.soak?.value, true);
    add("SWFFG.ItemsDefense", system.defence?.value, true);
  }
  const other = !["weapon", "armour"].includes(doc.type);
  add("SWFFG.ItemsEncum", system.encumbrance?.value, other);
  add("SWFFG.ItemsHP", system.hardpoints?.value);
  add("SWFFG.ItemsPrice", system.price?.value);
  const rarity = system.rarity;
  if (rarity) {
    const restricted = rarity.isrestricted ? ` ${t("SWFFG.NpcGenerator.App.Restricted")}` : "";
    add("SWFFG.ItemsRarity", `${rarity.value}${restricted}`, other);
  }
  const qualities = [];
  for (const quality of system.itemmodifier ?? []) {
    const name = quality.name.replace(/ Quality$/, "");
    const rank = quality.system?.rank;
    // descriptions hold dice codes such as [BO], which are drawn as dice once enriched. {0} stands for the rank
    // some imported qualities keep their description as an array of lines
    const lines = [quality.system?.description].flat().filter((line) => typeof line === "string");
    const text = (lines.join(" ") || name).replaceAll("{0}", rank ?? "");
    qualities.push({
      label: rank > 1 ? `${name} ${rank}` : name,
      tooltip: await foundry.applications.ux.TextEditor.implementation.enrichHTML(text, { relativeTo: doc }),
    });
  }
  const description = await foundry.applications.ux.TextEditor.implementation.enrichHTML(system.description ?? "", {
    relativeTo: doc,
  });
  const summary = stats.filter((stat) => stat.summary);
  return { img: doc.img, stats, summary, qualities, description, restricted: !!rarity?.isrestricted };
}

/** The NPC generator window: the GM picks presets, previews the NPC, rerolls or locks sections, and creates it */
export class NpcGenerator extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "swffg-npc-generator",
    classes: ["starwarsffg", "npc-generator"],
    tag: "form",
    window: {
      title: `${PREFIX}.Title`,
      icon: "fa-solid fa-users-gear",
      resizable: true,
      contentClasses: ["standard-form"],
    },
    position: { width: 780, height: 720 },
    form: { handler: NpcGenerator._onChange, submitOnChange: true, closeOnSubmit: false },
    actions: {
      reroll: NpcGenerator._onReroll,
      lock: NpcGenerator._onLock,
      rerollAll: NpcGenerator._onRerollAll,
      create: NpcGenerator._onCreate,
      openDocument: NpcGenerator._onOpenDocument,
      toggleSpecies: NpcGenerator._onToggleSpecies,
      toggleLimits: NpcGenerator._onToggleLimits,
      pickSpecies: NpcGenerator._onPickSpecies,
    },
  };

  static PARTS = {
    form: {
      template: "systems/starwarsffg/templates/wizards/npc_generator/generator.html",
      scrollable: [".npc-generator-preview"],
    },
  };

  constructor(options) {
    super(options);
    // the world's species, talents, and items, read once when the window opens
    this._content = null;
    this._draft = null;
    // item details by uuid, so a reroll doesn't read the same compendium items again
    this._itemDetails = new Map();
    // the gear rows left open, so a reroll doesn't close them
    this._expanded = new Set();
    this._speciesOpen = false;
    // the sections whose limits panel is open
    this._limitsOpen = new Set();
    this._choices = {
      archetype: constants.start.archetype, type: constants.start.type, tier: constants.start.tier,
      size: constants.start.minionSize, modifiers: [], species: "", name: "", folder: "",
      filters: Object.fromEntries(FILTERS.map((key) => [key, { allow: [], exclude: [] }])),
      rarityMin: null, rarityMax: null, allowRestricted: true,
    };
  }

  /** The window's choices as options for generate() */
  _engineOptions() {
    const c = this._choices;
    const options = { archetype: c.archetype, modifiers: c.modifiers, type: c.type, tier: c.tier };
    if (c.type === "minion") options.size = c.size;
    if (c.species === "none") options.species = false;
    else if (c.species) options.species = c.species;
    if (c.name) options.name = c.name;
    options.filters = {
      ...foundry.utils.deepClone(c.filters),
      rarity: [c.rarityMin ?? undefined, c.rarityMax ?? undefined],
      restricted: c.allowRestricted ? undefined : false,
    };
    return options;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    if (!this._content) {
      this._content = await loadContent();
      this._draft = await generate({ content: this._content, ...this._engineOptions() });
    }
    const c = this._choices;
    const presets = listPresets();
    const selected = (list, value) => list.map((entry) => ({ ...entry, selected: entry.value === value }));
    const archetypes = presets.archetype.map((p) => ({ value: p.id, label: p.label }));
    const species = game.i18n.sortObjects([...this._content.species], "name");
    const folders = game.i18n.sortObjects(game.folders.filter((f) => f.type === "Actor"), "name");
    const speciesList = selected([
      { value: "", label: game.i18n.localize(`${PREFIX}.Random`), icon: "fa-solid fa-dice" },
      { value: "none", label: game.i18n.localize(`${PREFIX}.NoSpecies`), icon: "fa-solid fa-ban" },
      ...species.map((s) => ({ value: s.uuid, label: s.name, img: s.img })),
    ], c.species);
    // each limit offers the tags its own kind of entry carries
    const filters = FILTERS.map((key) => {
      const entries = key === "species" ? this._content.species : this._content.items.filter((e) => e.type === key);
      const tags = [...new Set(entries.flatMap((entry) => entry.tags ?? []))].sort();
      const options = (chosen) => tags.map((tag) => ({ value: tag, selected: chosen.includes(tag) }));
      const chosen = c.filters[key];
      return {
        key, label: `${PREFIX}.Filter.${key}`, hasTags: tags.length > 0,
        allow: options(chosen.allow), exclude: options(chosen.exclude),
      };
    });
    return Object.assign(context, {
      archetypes: selected(archetypes, c.archetype),
      modifiers: presets.modifier.map((p) => ({
        id: p.id, label: p.label, checked: c.modifiers.includes(p.id), order: c.modifiers.indexOf(p.id) + 1,
        tip: explainModifier(CONFIG.FFG.npcGenerator.modifiers[p.id]),
      })),
      // the adversary types are the ones with a tier table
      types: selected(Object.keys(CONFIG.FFG.npcGenerator.tiers).map((t) => ({
        value: t, label: game.i18n.localize(`TYPES.Actor.${t}`),
      })), c.type),
      tiers: selected(Array.fromRange(constants.tierCount, 1).map((t) => ({
        value: t, label: game.i18n.localize(`${PREFIX}.Tier${t}`),
      })), c.tier),
      minion: c.type === "minion",
      size: c.size,
      species: speciesList,
      speciesChoice: speciesList.find((s) => s.selected) ?? speciesList[0],
      speciesOpen: this._speciesOpen,
      limits: this._limits(filters),
      allowRestricted: c.allowRestricted,
      rarityMin: c.rarityMin,
      rarityMax: c.rarityMax,
      folders: selected([
        { value: "", label: game.i18n.localize(`${PREFIX}.NoFolder`) },
        ...folders.map((f) => ({ value: f.id, label: f.name })),
      ], c.folder),
      name: c.name,
      noItems: !this._content.items.length,
      preview: { ...this._preview(), gear: await this._gearRows() },
    });
  }

  /** The limits panels in the Species and Gear headers, each with a count of the limits set in it */
  _limits(filters) {
    const c = this._choices;
    const set = (key) => c.filters[key].allow.length + c.filters[key].exclude.length;
    const species = filters.filter((f) => f.key === "species" && f.hasTags);
    const gear = filters.filter((f) => f.key !== "species" && f.hasTags);
    const gearCount = gear.reduce((n, f) => n + set(f.key), 0)
      + (c.rarityMin !== null) + (c.rarityMax !== null) + !c.allowRestricted;
    return {
      species: species.length
        ? { open: this._limitsOpen.has("species"), count: set("species"), tags: species }
        : null,
      gear: { open: this._limitsOpen.has("gear"), count: gearCount, tags: gear },
    };
  }

  /** The NPC's gear for the preview, each with its item's stats */
  async _gearRows() {
    const rows = [];
    for (const item of this._draft.items) {
      if (!this._itemDetails.has(item.uuid)) {
        const doc = await fromUuid(item.uuid);
        this._itemDetails.set(item.uuid, doc ? await describeItem(doc) : { stats: [], summary: [], description: "" });
      }
      const key = `${item.slot}:${item.uuid}`;
      const details = this._itemDetails.get(item.uuid);
      // a weapon's skill shows the dice this NPC would roll with it
      const stats = details.stats.map((stat) => (stat.skill ? { ...stat, ...this._pool(stat.skill) } : stat));
      rows.push({ ...item, ...details, stats: stats, key: key, open: this._expanded.has(key) });
    }
    return rows;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const search = this.element.querySelector(".npc-generator-species-search");
    // the search only filters the list. As a form change, it would re-render the list away under a click
    search?.addEventListener("change", (event) => event.stopPropagation());
    search?.addEventListener("input", () => {
      const text = search.value.trim().toLowerCase();
      for (const option of this.element.querySelectorAll(".npc-generator-species-list li")) {
        option.hidden = !!text && !option.textContent.toLowerCase().includes(text);
      }
    });
    search?.focus();
    for (const details of this.element.querySelectorAll("details[data-key]")) {
      details.addEventListener("toggle", () => {
        if (details.open) this._expanded.add(details.dataset.key);
        else this._expanded.delete(details.dataset.key);
      });
    }
  }

  /** The NPC as the preview shows it */
  _preview() {
    const draft = this._draft;
    const t = (key) => game.i18n.localize(key);
    const stats = [
      { label: t("SWFFG.Soak"), value: draft.stats.soak },
      { label: t("SWFFG.Defense"), value: draft.stats.defence },
    ];
    if (draft.type === "minion") {
      stats.push({ label: t(`${PREFIX}.UnitWounds`), value: `${draft.stats.unitWounds} × ${draft.size}` });
    } else {
      stats.push({ label: t("SWFFG.Wounds"), value: draft.stats.wounds });
    }
    if (draft.stats.strain !== undefined) stats.push({ label: t("SWFFG.Strain"), value: draft.stats.strain });
    return {
      name: draft.name,
      type: t(`TYPES.Actor.${draft.type}`),
      species: draft.species,
      hasTalents: draft.type !== "minion",
      characteristics: characteristics().map((c) => ({
        label: t(CONFIG.FFG.characteristics[c].abrev), value: draft.characteristics[c],
      })),
      skills: Object.keys(draft.skills).map((key) => this._skillRow(key)),
      talents: draft.talents.map((talent) => ({ ...talent, ranked: talent.rank > 1 })),
      stats: stats,
      locks: Object.fromEntries(SECTIONS.map((s) => [s, !!draft.locks[s]])),
    };
  }

  /** A skill row for the preview: its name and dice */
  _skillRow(key) {
    return {
      key: key,
      label: game.i18n.localize(CONFIG.FFG.skills[key]?.label ?? key),
      ...this._pool(key),
    };
  }

  /** A skill's dice, drawn as on the actor sheets, with a tooltip saying where they come from */
  _pool(key) {
    const dice = skillDice(this._draft, key);
    const pool = new DicePoolFFG({ ability: dice.ability, proficiency: dice.proficiency });
    const group = this._draft.skills[key]?.groupskill;
    return {
      pool: pool.renderPreview().innerHTML,
      tooltip: game.i18n.format(`${PREFIX}.${group ? "GroupPool" : "Pool"}`, {
        characteristic: game.i18n.localize(CONFIG.FFG.characteristics[dice.characteristic]?.label ?? ""),
        value: dice.value,
        rank: dice.rank,
        size: this._draft.size,
      }),
    };
  }

  static async _onChange(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    const c = this._choices;
    // modifiers apply in the order they were ticked, so new ones go on the end
    const ticked = [...form.querySelectorAll("input[data-modifier]:checked")].map((input) => input.dataset.modifier);
    c.modifiers = [...c.modifiers.filter((m) => ticked.includes(m)), ...ticked.filter((m) => !c.modifiers.includes(m))];
    c.archetype = data.archetype;
    c.type = data.type;
    c.tier = Number(data.tier);
    if (data.size) c.size = Math.max(1, Number(data.size));
    c.name = data.name?.trim() ?? "";
    c.folder = data.folder;
    // only the limits on screen are in the form, so a closed panel keeps what was set
    const shown = (name) => !!form.querySelector(`[name="${name}"]`);
    for (const key of FILTERS) {
      if (!shown(`filters.${key}.allow`)) continue;
      const chosen = data.filters?.[key] ?? {};
      c.filters[key] = { allow: [...(chosen.allow ?? [])], exclude: [...(chosen.exclude ?? [])] };
    }
    if (shown("allowRestricted")) c.allowRestricted = !!data.allowRestricted;
    const bound = (value) => (value === null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value));
    if (shown("rarityMin")) {
      c.rarityMin = bound(data.rarityMin);
      c.rarityMax = bound(data.rarityMax);
    }
    await regenerate(this._draft, { content: this._content, ...this._engineOptions() });
    this.render();
  }

  static async _onReroll(event, target) {
    await reroll(this._draft, target.dataset.step, this._content);
    this.render();
  }

  static async _onLock(event, target) {
    const step = target.dataset.step;
    this._draft.locks[step] = !this._draft.locks[step];
    this.render();
  }

  static async _onRerollAll() {
    this._draft.seed = newSeed();
    this._draft.rolls = {};
    await regenerate(this._draft, { content: this._content, ...this._engineOptions() });
    this.render();
  }

  static async _onCreate(event, target) {
    target.disabled = true;
    try {
      const actor = await createActor(this._draft, { folder: this._choices.folder || null });
      ui.notifications.info(game.i18n.format(`${PREFIX}.Created`, { name: actor.name }));
      actor.sheet.render(true);
    } finally {
      target.disabled = false;
    }
  }

  static _onToggleLimits(event, target) {
    const section = target.dataset.limits;
    if (this._limitsOpen.has(section)) this._limitsOpen.delete(section);
    else this._limitsOpen.add(section);
    this.render();
  }

  static _onToggleSpecies() {
    this._speciesOpen = !this._speciesOpen;
    this.render();
  }

  static async _onPickSpecies(event, target) {
    this._choices.species = target.dataset.value;
    this._speciesOpen = false;
    await regenerate(this._draft, { content: this._content, ...this._engineOptions() });
    this.render();
  }

  static async _onOpenDocument(event, target) {
    const doc = await fromUuid(target.dataset.uuid);
    doc?.sheet.render(true);
  }
}
