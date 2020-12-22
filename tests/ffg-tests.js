import "../node_modules/mocha/mocha.js";
import "../node_modules/chai/chai.js";

import { HelpersTests } from "./common.test.js";
import { ModifiersTests } from "./modifiers.test.js";

export default class FFGFunctionalTests extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "functional-test",
      classes: ["starwarsffg"],
      title: "Functional Tests",
      template: "systems/starwarsffg/templates/ffg-tester.html",
    });
  }

  /** @override */
  async getData() {
    const mocha = new Mocha({
      timeout: 200000,
      reporter: "json",
    });
    const Test = Mocha.Test;
    const suiteInstance = Mocha.Suite;
    const suite = suiteInstance.create(mocha.suite, "Functional Tests");

    // Define Test Suites Here
    HelpersTests(suite, suiteInstance, Test, chai);
    ModifiersTests(suite, suiteInstance, Test, chai);

    // Run Tests
    const mochaRun = () => {
      return new Promise((resolve, reject) => {
        let pass = [];
        let fail = [];

        mocha
          .run()
          .on("pass", (test) => {
            pass.push(test);
          })
          .on("fail", (test, err) => {
            fail.push({ ...test, ...err });
          })
          .on("end", () => {
            let suites = [];

            pass.forEach((p) => {
              const s = p.parent.title;
              if (!suites.find((b) => b.title === s)) {
                suites.push({ title: s, tests: { pass: [], fail: [] } });
              }
              let foundSuite = suites.find((b) => b.title === s);
              foundSuite.tests.pass.push(p);
            });

            fail.forEach((p) => {
              const s = p.parent.title;
              if (!suites.find((b) => b.title === s)) {
                suites.push({ title: s, tests: { pass: [], fail: [] } });
              }
              let foundSuite = suites.find((b) => b.title === s);
              foundSuite.tests.fail.push(p);
            });

            resolve({ suites, pass, fail });
          });
      });
    };

    const results = await mochaRun();

    const data = {
      pass: results.pass,
      fail: results.fail,
      suites: results.suites,
    };
    return data;
  }

  /** @override */
  _updateObject(event, formData) {}
}
