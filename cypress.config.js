const { defineConfig } = require("cypress");

module.exports = defineConfig({
    e2e: {
        /**
         * Override baseUrl if provided via the cypress.env.json
         * https://stackoverflow.com/questions/47262338/overriding-configuration-variables-from-cypress-env-json
         */
        setupNodeEvents(on, config) {
            if (config.hasOwnProperty("env") && config.env.hasOwnProperty("baseUrl")) {
                config.baseUrl = config.env.baseUrl;
            }
            return config;
        },
        baseUrl: "http://localhost:30001",
    },
    viewportWidth: 1440,
    viewportHeight: 900,
    defaultCommandTimeout: 60000,
});
