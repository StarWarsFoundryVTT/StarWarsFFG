import { canPurchaseNode } from "../modules/helpers/talent-tree.js";

const specOpts = { prefix: "talent", width: 4, total: 20, sizeAware: false };
const fpOpts   = { prefix: "upgrade", width: 4, total: 16, sizeAware: true };

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
  for (let i = 0; i < 16; i++) tree[`upgrade${i}`] = { islearned: false, sizeInt: 1 };
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

  _suite.addTest(new Test("Force power row 0 (root) is purchasable when unlearned", function () {
    chai.expect(canPurchaseNode(fp(), "upgrade2", fpOpts)).to.equal(true);
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
};
