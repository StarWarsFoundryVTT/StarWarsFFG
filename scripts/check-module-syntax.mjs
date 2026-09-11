import {execFileSync} from "node:child_process";
import {readdirSync, statSync} from "node:fs";
import {join} from "node:path";

function javascriptFiles(directory) {
  return readdirSync(directory).flatMap(entry => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? javascriptFiles(path) : (path.endsWith(".js") ? [path] : []);
  });
}

const files = javascriptFiles("modules");
for (const file of files) execFileSync(process.execPath, ["--check", file], {stdio: "pipe"});
console.log(`Syntax checked ${files.length} module files.`);
