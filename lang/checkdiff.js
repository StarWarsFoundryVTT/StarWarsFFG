// A simple node tool to help translators check for any missing keys in a particular language file vs en.json
// Set the path of the 'checklang' variable to whichever language you want to compare with en.json
// Then from terminal run: node checkdiff.js

const enlang = require("./en.json");

const frlang = require("./fr.json");
const eslang = require("./es.json");
const delang = require("./de.json");
const ualang = require("./ua.json");

const checklang = [frlang, eslang, delang, ualang];

console.log("Localisation hooks missing from fr.json:\n");
Object.keys(enlang).forEach((key, index) => {
  if (!(key in checklang[0])) {
    console.log(`\"${key}\": \"${enlang[key]}\",`);
  }
});
console.log("\n");

console.log("Localisation hooks missing from es.json:\n");
Object.keys(enlang).forEach((key, index) => {
  if (!(key in checklang[1])) {
    console.log(`\"${key}\": \"${enlang[key]}\",`);
  }
});
console.log("\n");

console.log("Localisation hooks missing from de.json:\n");
Object.keys(enlang).forEach((key, index) => {
  if (!(key in checklang[2])) {
    console.log(`\"${key}\": \"${enlang[key]}\",`);
  }
});
console.log("\n");

console.log("Localisation hooks missing from ua.json:\n");
Object.keys(enlang).forEach((key, index) => {
  if (!(key in checklang[3])) {
    console.log(`\"${key}\": \"${enlang[key]}\",`);
  }
});
console.log("\n");
