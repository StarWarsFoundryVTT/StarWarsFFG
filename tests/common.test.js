import Helpers from "../modules/helpers/common.js";

export const HelpersTests = (suite, suiteInstance, Test, chai) => {
  const _suite = suiteInstance.create(suite, `Common Helpers`);

  _suite.addTest(
    new Test("Object Diff Function should return correct diff", function () {
      chai.expect(Helpers.diff({ a: 1 }, { b: 1 })).to.deep.equal({ "a": undefined });
    })
  );
};
