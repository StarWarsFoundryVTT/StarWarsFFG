// A simple node tool to help translators check for any missing keys in a particular language file vs en.json
// Set the path of the 'checklang' variable to whichever language you want to compare with en.json
// Then from terminal run: node checkdiff.js

const enlang = require("./en.json");

const checklang = require("./de.json");

Object.keys(enlang).forEach((key, index) => {
  if (!(key in checklang)) {
    console.log(`\"${key}\": \"\",`);
  }
});
