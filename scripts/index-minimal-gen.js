/**
 * Create features index file.
 * Script takes two arguments:
 * - module version (cjs or es6)
 * - Should list minified files (true or false) 
 */

const path = require("path");
const fs = require('fs');

/* Get arguments */
const esm = process.argv[2];
const shouldMinify = !!process.env.RXP_MINIFY;

if (esm !== "es6" && esm !== "cjs") {
  console.log("Minimal generator -- Module version should be \"es6\" or \"commonjs\"");
  return;
}

/* Export functions */
function createES6Export(featureName, halfPath, extension) {
  return "export { " + featureName.toUpperCase() + " } from \"./"+
    halfPath + "/" + featureName + extension + "\";\n";
}

function createCommonJSExport(featureName, halfPath, extension) {
  return "exports." + featureName.toUpperCase() + " = require(\"../" +
    halfPath + "/" + featureName + extension + "\");\n";
}

const createExport = esm === "es6" ? createES6Export : createCommonJSExport;

/* Build paths for getting and building */
const featuresPath = path.resolve("./src/features/list/");
const buildPath = path.resolve("./features/");

const features = [];

fs.readdirSync(featuresPath).forEach(file => {
  const feature = file.split(".ts")[0];
  if (feature !== "index") {
    features.push(feature);
  }
})

let fileText = "";

features.forEach((feature) => {
  const halfPath = (shouldMinify ? "minified" : "standard");
  const extension = (shouldMinify ? ".min.js" : ".js");
  fileText += createExport(feature, halfPath, extension);
});

/* Create folder if doesn't exist */
if (!fs.existsSync(buildPath + "/" + (esm === "cjs" ? esm + "/" : ""))) {
  fs.mkdirSync(buildPath + "/" + (esm === "cjs" ? esm + "/" : ""));
}

/* Write file */
fs.writeFile(buildPath + "/" + (esm === "cjs" ? esm + "/" : "") + "index"+
  (shouldMinify ? ".min.js" : ".js"), fileText, function(err) {
  if (err) {
    console.log("Minimal generator -- Error - while generating minimal index: " + err);
  }
  console.log("Minimal generator -- Success.");
}); 