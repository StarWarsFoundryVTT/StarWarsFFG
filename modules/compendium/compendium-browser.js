const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export const SWFFG_COMPENDIUM_BROWSER_TABS = [
  { id: "weapons", img: "systems/starwarsffg/images/defaults/items/weapon.png", label: "SWFFG.CompendiumBrowser.Tabs.Weapons", documentClass: "Item", types: ["weapon", "shipweapon"] },
  { id: "armour", img: "systems/starwarsffg/images/defaults/items/armor.png", label: "SWFFG.ItemsArmor", documentClass: "Item", types: ["armour"] },
  { id: "gear", img: "systems/starwarsffg/images/defaults/items/gear.png", label: "SWFFG.CompendiumBrowser.Tabs.Gear", documentClass: "Item", types: ["gear"] },
  { id: "attachments", img: "systems/starwarsffg/images/defaults/items/attachment.png", label: "SWFFG.CompendiumBrowser.Tabs.Attachments", documentClass: "Item", types: ["itemattachment", "shipattachment"] },
  { id: "mods", img: "systems/starwarsffg/images/defaults/items/itemmodifier.png", label: "SWFFG.CompendiumBrowser.Tabs.Mods", documentClass: "Item", types: ["itemmodifier"] },
  { id: "talents", icon: "fas fa-star", label: "SWFFG.CompendiumBrowser.Tabs.Talents", documentClass: "Item", types: ["talent"] },
  { id: "specializations", icon: "fas fa-code-branch", label: "SWFFG.CompendiumBrowser.Tabs.Specializations", documentClass: "Item", types: ["specialization"] },
  { id: "species", img: "systems/starwarsffg/images/defaults/actors/character.png", label: "SWFFG.CompendiumBrowser.Tabs.Species", documentClass: "Item", types: ["species"] },
  { id: "careers", icon: "fas fa-briefcase", label: "SWFFG.CompendiumBrowser.Tabs.Careers", documentClass: "Item", types: ["career"] },
  { id: "forcepowers", icon: "fas fa-wand-sparkles", label: "SWFFG.CompendiumBrowser.Tabs.ForcePowers", documentClass: "Item", types: ["forcepower"] },
  { id: "signatureabilities", icon: "fas fa-medal", label: "SWFFG.CompendiumBrowser.Tabs.SignatureAbilities", documentClass: "Item", types: ["signatureability"] },
  { id: "vehicles", img: "systems/starwarsffg/images/defaults/actors/vehicle.png", label: "SWFFG.CompendiumBrowser.Tabs.Vehicles", documentClass: "Actor", types: ["vehicle"] },
  { id: "adversaries", img: "systems/starwarsffg/images/defaults/actors/nemesis.png", label: "SWFFG.CompendiumBrowser.Tabs.Adversaries", documentClass: "Actor", types: ["minion", "rival", "nemesis"] },
  { id: "other", icon: "fas fa-ellipsis", label: "SWFFG.CompendiumBrowser.Tabs.Other", documentClass: "Item", types: ["ability", "background", "obligation", "motivation", "criticaldamage", "criticalinjury", "homesteadupgrade"] },
];

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 200;

const IGNORED_TAG_HINTS = new Set(["weapon", "shipweapon", "armour", "armor", "gear", "talent"]);

// stats each tab can be filtered by; every tab also gets a source book filter
const stat = (path, label) => ({ key: path, path, label });
const RARITY = stat("system.rarity.value", "SWFFG.ItemsRarity");
const TAB_STAT_FILTERS = {
  weapons: [
    stat("system.skill.value", "SWFFG.ItemsSkill"), stat("system.range.value", "SWFFG.ItemsRange"),
    stat("system.damage.value", "SWFFG.ItemsDamage"), stat("system.crit.value", "SWFFG.ItemsCrit"), RARITY,
  ],
  armour: [stat("system.defence.value", "SWFFG.ItemsDefense"), stat("system.soak.value", "SWFFG.Soak"), RARITY],
  gear: [stat("system.encumbrance.value", "SWFFG.Encumbrance"), RARITY],
  attachments: [stat("system.hardpoints.value", "SWFFG.Labels.HardPoints"), RARITY],
  talents: [
    stat("system.activation.value", "SWFFG.TalentsActivation"), stat("system.ranks.ranked", "SWFFG.Ranked"),
    stat("system.isForceTalent", "SWFFG.ForceTalent"),
  ],
  forcepowers: [stat("system.required_force_rating", "SWFFG.ForcePowerRequiredFR")],
  vehicles: [
    stat("system.stats.silhouette.value", "SWFFG.VehicleSilhouette"),
    stat("system.stats.speed.max", "SWFFG.VehicleSpeed"),
    stat("system.stats.handling.value", "SWFFG.VehicleHandling"),
    stat("system.stats.armour.value", "SWFFG.VehicleArmor"),
    stat("system.stats.rarity.value", "SWFFG.ItemsRarity"),
  ],
  adversaries: [
    ...["Brawn", "Agility", "Intellect", "Cunning", "Willpower", "Presence"].map(
      (c) => stat(`system.characteristics.${c}.value`, `SWFFG.Characteristic${c}`)),
    stat("system.stats.soak.value", "SWFFG.Soak"), stat("system.stats.wounds.max", "SWFFG.Thresholds.Wound"),
  ],
};
const SOURCE_FILTER = { key: "source", label: "SWFFG.Source" };
// how a numeric stat is compared to the chosen value; anything else is matched exactly
const STAT_OPERATORS = { "=": "=", ">": ">", ">=": "≥", "<": "<", "<=": "≤" };
const STAT_COMPARISONS = {
  ">": (a, b) => a > b, ">=": (a, b) => a >= b, "<": (a, b) => a < b, "<=": (a, b) => a <= b,
};

export default class CompendiumBrowser extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "swffg-compendium-browser",
    classes: ["starwarsffg", "compendium-browser"],
    tag: "form",
    window: {
      title: "SWFFG.CompendiumBrowser.Title",
      icon: "fas fa-book-open-reader",
      minimizable: true,
      resizable: true,
      contentClasses: ["standard-form"],
    },
    position: { width: 900, height: 720 },
    form: { submitOnChange: false, closeOnSubmit: false },
    actions: {
      changeTab: CompendiumBrowser._onChangeTab,
      toggleTag: CompendiumBrowser._onToggleTag,
      clearTags: CompendiumBrowser._onClearTags,
      openEntry: CompendiumBrowser._onOpenEntry,
      clearSearch: CompendiumBrowser._onClearSearch,
    },
  };

  static PARTS = {
    tabs: { template: "systems/starwarsffg/templates/compendium/browser-tabs.html" },
    sidebar: { template: "systems/starwarsffg/templates/compendium/browser-sidebar.html" },
    results: { template: "systems/starwarsffg/templates/compendium/browser-results.html", scrollable: [""] },
  };

  constructor(options) {
    super(options);
    this._activeTab = SWFFG_COMPENDIUM_BROWSER_TABS[0].id;
    this._search = "";
    this._selectedTags = new Set();
    this._availableTags = [];
    this._statFilters = new Map();
    this._statOps = new Map();
    this._statOptions = [];
    this._fullIndex = [];
    this._filtered = [];
    this._renderedCount = 0;
    this._loading = true;
    this._searchDebounce = null;
  }

  get currentTabDef() {
    return SWFFG_COMPENDIUM_BROWSER_TABS.find((t) => t.id === this._activeTab);
  }

  async _prepareContext() {
    const tabs = SWFFG_COMPENDIUM_BROWSER_TABS.map((t) => ({
      ...t,
      label: game.i18n.localize(t.label),
      active: t.id === this._activeTab,
    }));
    const shown = this._filtered.slice(0, this._renderedCount);
    return {
      tabs,
      activeTab: this._activeTab,
      search: this._search,
      availableTags: this._availableTags.map((tag) => ({ tag, selected: this._selectedTags.has(tag) })),
      selectedCount: this._selectedTags.size,
      hasTagsFilter: this._availableTags.length > 0,
      statFilters: this._statOptions.map((s) => ({
        ...s, selected: this._statFilters.get(s.key) ?? "", op: this._statOps.get(s.key) ?? "=",
      })),
      statOperators: STAT_OPERATORS,
      activeFilterCount: this._selectedTags.size + this._statFilters.size,
      results: shown,
      totalCount: this._filtered.length,
      renderedCount: shown.length,
      hasMore: this._renderedCount < this._filtered.length,
      loading: this._loading,
      empty: !this._loading && this._filtered.length === 0,
      localizeType: (type) => game.i18n.localize(`TYPES.${this.currentTabDef.documentClass}.${type}`),
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    if (options.isFirstRender || options.changedTab) {
      this._loadTab();
    }
  }

  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    if (partId === "sidebar") {
      const searchInput = htmlElement.querySelector('input[name="swffg-cb-search"]');
      if (searchInput) {
        searchInput.addEventListener("input", (event) => {
          clearTimeout(this._searchDebounce);
          this._searchDebounce = setTimeout(() => this._onSearchInput(event.target.value), SEARCH_DEBOUNCE_MS);
        });
      }
      htmlElement.querySelectorAll("select[data-stat]").forEach((select) => {
        select.addEventListener("change", (event) => this._onStatChange(event.target));
      });
      htmlElement.querySelectorAll("select[data-stat-op]").forEach((select) => {
        select.addEventListener("change", (event) => this._onStatOpChange(event.target));
      });
    } else if (partId === "results") {
      htmlElement.addEventListener("scroll", (event) => this._onScrollResults(event));
      htmlElement.querySelectorAll('[data-action="openEntry"]').forEach((el) => {
        el.addEventListener("dragstart", (event) => this._onDragStart(event));
      });
    }
  }

  async _loadTab() {
    try {
      this._fullIndex = await CompendiumBrowser._fetchIndex(this.currentTabDef);
      this._collectAvailableTags();
      this._collectStatOptions();
      this._applyFilters();
    } catch (err) {
      CONFIG.logger.error(`CompendiumBrowser: failed to load index`, err);
      ui.notifications.error(game.i18n.localize("SWFFG.CompendiumBrowser.Errors.LoadFailed"));
      this._fullIndex = [];
      this._filtered = [];
      this._availableTags = [];
      this._statOptions = [];
    } finally {
      this._loading = false;
    }
    await this.render({ parts: ["sidebar", "results"] });
  }

  async _refresh() {
    this._applyFilters();
    await this.render({ parts: ["sidebar", "results"] });
  }

  _refreshCount() {
    const el = this.element?.querySelector(".cb-count");
    if (!el) return;
    const count = game.i18n.format("SWFFG.CompendiumBrowser.ResultsCount", { count: this._filtered.length });
    const active = this._selectedTags.size + this._statFilters.size;
    const selected = game.i18n.localize("SWFFG.CompendiumBrowser.TagsSelected");
    const note = active
      ? `<span class="cb-filtered-note">(${active} ${selected})</span>`
      : "";
    el.innerHTML = `<span>${count}</span>${note}`;
  }

  static async _fetchIndex(tabDef) {
    const types = new Set(tabDef.types);
    const typeName = tabDef.documentClass === "Item" ? "Item" : "Actor";
    const packs = game.packs.filter((p) => p.metadata.type === typeName && p.visible);
    const statDefs = TAB_STAT_FILTERS[tabDef.id] ?? [];
    const indexFields = [
      "img", "type", "system.metadata.tags", "system.metadata.sources", ...statDefs.map((s) => s.path),
    ];
    const results = [];
    for (const pack of packs) {
      let matched = 0;
      let withTags = 0;
      try {
        const index = await pack.getIndex({ fields: indexFields });
        for (const entry of index) {
          if (!types.has(entry.type)) continue;
          matched++;
          let tags = foundry.utils.getProperty(entry, "system.metadata.tags");
          if (!tags) tags = foundry.utils.getProperty(entry, "system.tags") || foundry.utils.getProperty(entry, "data.metadata.tags") || [];
          if (!Array.isArray(tags)) tags = [];
          const sources = foundry.utils.getProperty(entry, "system.metadata.sources") || [];
          if (tags.length) withTags++;
          const stats = Object.fromEntries(statDefs.map((s) => [s.key, CompendiumBrowser._statValue(entry, s.path)]));
          // "Book pg.12" files under "Book"
          const books = (Array.isArray(sources) ? sources : []).map((s) => String(s).replace(/\s*pg\.\s*\S+$/i, ""));
          stats[SOURCE_FILTER.key] = books;
          results.push({
            uuid: entry.uuid,
            name: entry.name,
            type: entry.type,
            img: entry.img,
            tags,
            sources: Array.isArray(sources) ? sources : [],
            stats,
            packLabel: pack.metadata.label,
          });
        }
      } catch (err) {
        CONFIG.logger.debug(`CompendiumBrowser: failed to index pack ${pack.collection}`, err);
      }
      if (matched > 0) {
        CONFIG.logger.debug(`CompendiumBrowser: pack ${pack.collection} matched ${matched} entries (${withTags} with tags)`);
      }
    }
    results.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
    return results;
  }

  _collectAvailableTags() {
    const set = new Set();
    for (const r of this._fullIndex) {
      for (const t of r.tags) if (t) set.add(t);
    }
    this._availableTags = [...set]
      .filter((t) => !IGNORED_TAG_HINTS.has(t) && t !== this._activeTab)
      .sort((a, b) => a.localeCompare(b, game.i18n.lang));
    CONFIG.logger.debug(`CompendiumBrowser [${this._activeTab}]: ${this._fullIndex.length} items, ${set.size} unique tags before filtering -> ${this._availableTags.length} shown`, this._availableTags.slice(0, 15));
  }

  /** A stat as a filterable string, or null when the entry doesn't have one. */
  static _statValue(entry, path) {
    const value = foundry.utils.getProperty(entry, path);
    return value === undefined || value === null || value === "" ? null : String(value);
  }

  _collectStatOptions() {
    this._statOptions = [];
    for (const def of [...(TAB_STAT_FILTERS[this._activeTab] ?? []), SOURCE_FILTER]) {
      const values = new Set();
      for (const r of this._fullIndex) {
        for (const v of [r.stats[def.key]].flat()) if (v) values.add(v);
      }
      // a stat every entry shares filters nothing
      if (values.size < 2) continue;
      const numeric = [...values].every((v) => v.trim() !== "" && !isNaN(Number(v)));
      const sorted = [...values].sort(
        (a, b) => (numeric ? Number(a) - Number(b) : a.localeCompare(b, game.i18n.lang)));
      const options = sorted.map((value) => ({ value, label: CompendiumBrowser._statLabel(value) }));
      this._statOptions.push({ key: def.key, label: game.i18n.localize(def.label), options, numeric });
    }
  }

  static _statLabel(value) {
    if (value === "true") return game.i18n.localize("SWFFG.OptionValueYes");
    if (value === "false") return game.i18n.localize("SWFFG.OptionValueNo");
    return game.i18n.localize(value);
  }

  _applyFilters() {
    const term = this._search.trim().toLowerCase();
    const selected = this._selectedTags;
    let filtered = this._fullIndex;
    if (selected.size > 0) {
      filtered = filtered.filter((r) => r.tags.some((t) => selected.has(t)));
    }
    for (const [key, want] of this._statFilters) {
      const compare = STAT_COMPARISONS[this._statOps.get(key)];
      if (compare) {
        filtered = filtered.filter((r) => r.stats[key] !== null && compare(Number(r.stats[key]), Number(want)));
      } else {
        filtered = filtered.filter((r) => [r.stats[key]].flat().includes(want));
      }
    }
    if (term.length > 0) {
      filtered = filtered.filter(
        (r) => r.name.toLowerCase().includes(term) || r.tags.some((t) => t.toLowerCase().includes(term))
      );
    }
    this._filtered = filtered;
    this._renderedCount = Math.min(PAGE_SIZE, this._filtered.length);
  }

  async _onSearchInput(value) {
    this._search = value || "";
    this._applyFilters();

    await this.render({ parts: ["results"] });
    this._refreshCount();
  }

  async _onScrollResults(event) {
    if (this._loading) return;
    const target = event.target;
    const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 100;
    if (!nearBottom) return;
    if (this._renderedCount >= this._filtered.length) return;
    this._renderedCount = Math.min(this._renderedCount + PAGE_SIZE, this._filtered.length);
    await this.render({ parts: ["results"] });
  }

  _resetForNewTab() {
    this._loading = true;
    this._search = "";
    this._selectedTags = new Set();
    this._availableTags = [];
    this._statFilters = new Map();
    this._statOps = new Map();
    this._statOptions = [];
    this._fullIndex = [];
    this._filtered = [];
    this._renderedCount = 0;
  }

  static async _onChangeTab(event, target) {
    const tabId = target.dataset.tab;
    if (!tabId || tabId === this._activeTab) return;
    this._activeTab = tabId;
    this._resetForNewTab();
    await this.render({ changedTab: true });
  }

  static async _onToggleTag(event, target) {
    const tag = target.dataset.tag;
    if (!tag) return;
    if (this._selectedTags.has(tag)) this._selectedTags.delete(tag);
    else this._selectedTags.add(tag);
    await this._refresh();
  }

  async _onStatChange(select) {
    if (select.value) this._statFilters.set(select.dataset.stat, select.value);
    else this._statFilters.delete(select.dataset.stat);
    await this._refresh();
  }

  async _onStatOpChange(select) {
    this._statOps.set(select.dataset.statOp, select.value);
    await this._refresh();
  }

  static async _onClearTags() {
    this._selectedTags.clear();
    await this._refresh();
  }

  static async _onClearSearch() {
    this._search = "";
    await this._refresh();
  }

  static async _onOpenEntry(event, target) {
    const uuid = target.closest("[data-uuid]")?.dataset.uuid;
    if (!uuid) return;
    const doc = await fromUuid(uuid);
    if (doc) doc.sheet.render(true);
  }

  _onDragStart(event) {
    const uuid = event.currentTarget.closest("[data-uuid]")?.dataset.uuid;
    if (!uuid) return;
    const entry = this._filtered.find((r) => r.uuid === uuid);
    if (!entry) return;
    const docType = this.currentTabDef.documentClass;
    const data = { type: docType, uuid: entry.uuid };
    try {
      event.dataTransfer.setData("text/plain", JSON.stringify(data));
    } catch (err) {
      CONFIG.logger.debug(`CompendiumBrowser: drag start failed`, err);
    }
  }
}
