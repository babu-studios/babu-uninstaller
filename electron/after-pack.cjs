const { execFile } = require("node:child_process");
const { readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");
const plist = require("plist");
const { promisify } = require("node:util");

const run = promisify(execFile);

module.exports = async function afterPack(context) {
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const infoPath = path.join(appPath, "Contents", "Info.plist");
  const data = plist.parse(await readFile(infoPath, "utf8"));
  for (const key of Object.keys(data)) {
    if (key.endsWith("UsageDescription")) delete data[key];
  }
  await writeFile(infoPath, plist.build(data));
  await run("/usr/bin/codesign", ["--force", "--deep", "--sign", "-", "--timestamp=none", appPath]);
};
