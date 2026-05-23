import { canPurchaseNode } from "../modules/helpers/talent-tree.js";

const specOpts = { prefix: "talent", width: 4, total: 20, sizeAware: false };
const fpOpts   = { prefix: "upgrade", width: 4, total: 16, sizeAware: true, rootHasImplicitParent: true };

function spec(overrides = {}) {
  const tree = {};
  for (let i = 0; i < 20; i++) tree[`talent${i}`] = { islearned: false };
  for (const [k, v] of Object.entries(overrides)) {
    tree[k] = { ...tree[k], ...v };
  }
  return tree;
}

function fp(overrides = {}) {
  const tree = {};
  for (let i = 0; i < 16; i++) tree[`upgrade${i}`] = { islearned: false, sizeInt: 1, visible: true };
  for (const [k, v] of Object.entries(overrides)) {
    tree[k] = { ...tree[k], ...v };
  }
  return tree;
}

// Variant where nodes only have the persistent `.size` string (no `sizeInt`),
// mirroring what the click-time guard sees in raw `this.object.system.upgrades`
// before getData's pre-pass runs.
function fpRaw(overrides = {}) {
  const tree = {};
  for (let i = 0; i < 16; i++) tree[`upgrade${i}`] = { islearned: false, size: "single", visible: true };
  for (const [k, v] of Object.entries(overrides)) {
    tree[k] = { ...tree[k], ...v };
  }
  return tree;
}

export const TalentTreeTests = (suite, suiteInstance, Test, chai) => {
  const _suite = suiteInstance.create(suite, "Talent Tree Helper");

  _suite.addTest(new Test("Root row unlearned is purchasable", function () {
    chai.expect(canPurchaseNode(spec(), "talent0", specOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Root row learned is not purchasable", function () {
    const t = spec({ talent0: { islearned: true } });
    chai.expect(canPurchaseNode(t, "talent0", specOpts)).to.equal(false);
  }));

  _suite.addTest(new Test("Non-root with no learned neighbors is not purchasable", function () {
    chai.expect(canPurchaseNode(spec(), "talent5", specOpts)).to.equal(false);
  }));

  _suite.addTest(new Test("Non-root with learned parent via links-top-1 is purchasable", function () {
    const t = spec({
      talent1: { islearned: true },
      talent5: { "links-top-1": true },
    });
    chai.expect(canPurchaseNode(t, "talent5", specOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Learned parent without links-top-1 on candidate is not enough", function () {
    const t = spec({ talent1: { islearned: true } });
    chai.expect(canPurchaseNode(t, "talent5", specOpts)).to.equal(false);
  }));

  _suite.addTest(new Test("Learned left neighbor with links-right is purchasable", function () {
    const t = spec({
      talent4: { islearned: true, "links-right": true },
    });
    chai.expect(canPurchaseNode(t, "talent5", specOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Learned left neighbor without links-right is not enough", function () {
    const t = spec({ talent4: { islearned: true } });
    chai.expect(canPurchaseNode(t, "talent5", specOpts)).to.equal(false);
  }));

  _suite.addTest(new Test("Learned right neighbor with candidate's links-right is purchasable", function () {
    const t = spec({
      talent5: { "links-right": true },
      talent6: { islearned: true },
    });
    chai.expect(canPurchaseNode(t, "talent5", specOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Learned child with links-top-1 makes parent purchasable (down-edge)", function () {
    const t = spec({
      talent5: {},
      talent9: { islearned: true, "links-top-1": true },
    });
    chai.expect(canPurchaseNode(t, "talent5", specOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Already-learned candidate is not purchasable", function () {
    const t = spec({
      talent5: { islearned: true, "links-top-1": true },
      talent1: { islearned: true },
    });
    chai.expect(canPurchaseNode(t, "talent5", specOpts)).to.equal(false);
  }));

  _suite.addTest(new Test("Rightmost column does not read off-grid for right edge", function () {
    const t = spec({ talent7: { "links-right": true } });
    chai.expect(canPurchaseNode(t, "talent7", specOpts)).to.equal(false);
  }));

  _suite.addTest(new Test("Force power row 0 needs an up-link to count as rooted", function () {
    // Without any links-top-N to the implicit basic power, a row-0 upgrade
    // is NOT automatically purchasable (the deeper "row 0 with links-top-1
    // is purchasable" case is covered below).
    chai.expect(canPurchaseNode(fp(), "upgrade2", fpOpts)).to.equal(false);
  }));

  _suite.addTest(new Test("Force power double-wide right neighbor lookup uses sizeInt", function () {
    const t = fp({
      upgrade4: { sizeInt: 2, "links-right": true },
      upgrade6: { islearned: true },
    });
    chai.expect(canPurchaseNode(t, "upgrade4", fpOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Force power left neighbor walk respects sizeInt", function () {
    const t = fp({
      upgrade4: { sizeInt: 2, islearned: true, "links-right": true },
      upgrade5: { sizeInt: 0 },
      upgrade6: {},
    });
    chai.expect(canPurchaseNode(t, "upgrade6", fpOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Force power placeholder neighbor never satisfies left edge", function () {
    const t = fp({
      upgrade5: { sizeInt: 0, islearned: true, "links-right": true },
      upgrade6: {},
    });
    chai.expect(canPurchaseNode(t, "upgrade6", fpOpts)).to.equal(false);
  }));

  _suite.addTest(new Test("Force power up-edge slot 2 looks at correct parent column", function () {
    const t = fp({
      upgrade5: { islearned: true },
      upgrade8: { sizeInt: 2, "links-top-2": true },
    });
    chai.expect(canPurchaseNode(t, "upgrade8", fpOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Raw data: double-wide candidate resolves size from .size string (up-slot-2)", function () {
    const t = fpRaw({
      upgrade11: { islearned: true },
      upgrade14: { size: "double", "links-top-2": true },
    });
    chai.expect(canPurchaseNode(t, "upgrade14", fpOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Raw data: double-wide candidate resolves size from .size string (up-slot-1)", function () {
    const t = fpRaw({
      upgrade10: { islearned: true },
      upgrade14: { size: "double", "links-top-1": true },
    });
    chai.expect(canPurchaseNode(t, "upgrade14", fpOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Raw data: up-walk past placeholder finds owning multi-column parent", function () {
    // Placeholder slot 3 has no recognised .size, so resolveSize() returns 0
    // and the walk steps past it to the double-wide owner at slot 2.
    const t = fpRaw({
      upgrade2: { size: "double", islearned: true },
      upgrade3: { size: "" },
      upgrade7: { "links-top-1": true },
    });
    chai.expect(canPurchaseNode(t, "upgrade7", fpOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Down-edge: double-wide parent finds learned single child via child's own slot-1 link", function () {
    // Increase Hull Trauma (upgrade8, sizeInt=2) checks its slot 2 (column 1).
    // The owning child below at col 1 is upgrade13 (single-width Range). The
    // link from upgrade13 to its parent above col 1 is stored as upgrade13's
    // OWN links-top-1 — not links-top-2 — because the index is the child's
    // own column offset from its left edge.
    const t = fp({
      upgrade8: { sizeInt: 2 },
      upgrade9: { sizeInt: 0 },
      upgrade13: { islearned: true, "links-top-1": true },
    });
    chai.expect(canPurchaseNode(t, "upgrade8", fpOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Down-edge: same scenario with raw .size strings (click-guard path)", function () {
    const t = fpRaw({
      upgrade8: { size: "double" },
      upgrade9: { size: "single", visible: false },
      upgrade13: { islearned: true, "links-top-1": true },
    });
    chai.expect(canPurchaseNode(t, "upgrade8", fpOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Down-walk steps PAST invisible placeholder to find multi-col owner", function () {
    // Single-width candidate Range (upgrade5, col 1) looking down to a
    // learned double-wide ICH (upgrade8, sizeInt=2 at col 0-1) that owns
    // col 1. The invisible placeholder upgrade9 (size:"single",
    // visible:false) must be treated as a non-cell so the walk continues
    // leftward and finds ICH. This is the user-reported asymmetry where
    // Mechanics (col 0, no placeholder in path) became purchasable but the
    // structurally-symmetric Range (col 1) did not.
    const t = fp({
      upgrade5: {},
      upgrade8: { sizeInt: 2, islearned: true, "links-top-1": true, "links-top-2": true },
      upgrade9: { sizeInt: 1, visible: false },
    });
    chai.expect(canPurchaseNode(t, "upgrade5", fpOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Down-walk past invisible placeholder (raw click-guard path)", function () {
    const t = fpRaw({
      upgrade5: {},
      upgrade8: { size: "double", islearned: true, "links-top-1": true, "links-top-2": true },
      upgrade9: { size: "single", visible: false },
    });
    chai.expect(canPurchaseNode(t, "upgrade5", fpOpts)).to.equal(true);
  }));

  // Force-power-specific row-0 rule: an implicit basic-power parent sits
  // above row 0. A row-0 upgrade is "rooted" only when it has a links-top-N
  // set; otherwise it has to connect via side or down like any other node.
  _suite.addTest(new Test("Force power row 0 with links-top-1 is purchasable", function () {
    const t = fp({ upgrade0: { "links-top-1": true } });
    chai.expect(canPurchaseNode(t, "upgrade0", fpOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Force power row 0 without any top-link and no side connection is NOT purchasable", function () {
    chai.expect(canPurchaseNode(fp(), "upgrade1", fpOpts)).to.equal(false);
  }));

  _suite.addTest(new Test("Force power row 0 without top-link connects via learned left neighbour's links-right", function () {
    const t = fp({
      upgrade0: { islearned: true, "links-right": true },
      upgrade1: {},
    });
    chai.expect(canPurchaseNode(t, "upgrade1", fpOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Force power row 0 multi-col with only links-top-2 set is purchasable", function () {
    const t = fp({
      upgrade2: { sizeInt: 2, "links-top-2": true },
      upgrade3: { sizeInt: 1, visible: false },
    });
    chai.expect(canPurchaseNode(t, "upgrade2", fpOpts)).to.equal(true);
  }));

  _suite.addTest(new Test("Specialization row 0 stays unconditional (no implicit parent)", function () {
    // No links, no learned neighbours — spec row 0 is still buyable.
    chai.expect(canPurchaseNode(spec(), "talent2", specOpts)).to.equal(true);
  }));
};
