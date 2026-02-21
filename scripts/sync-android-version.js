#!/usr/bin/env node
/**
 * Syncs the version from package.json into android/build.gradle.
 * Run automatically as part of `changeset:version`.
 *
 * versionCode is calculated as: major * 10000 + minor * 100 + patch
 * e.g. 1.2.3 → 10203, 0.2.0 → 200
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const gradlePath = path.join(rootDir, 'android', 'build.gradle');

const { version } = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const [major, minor, patch] = version.split('.').map(Number);
const versionCode = major * 10000 + minor * 100 + patch;

let gradle = fs.readFileSync(gradlePath, 'utf8');

gradle = gradle
  .replace(/^version = '[^']+'/m, `version = '${version}'`)
  .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
  .replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);

fs.writeFileSync(gradlePath, gradle, 'utf8');

console.log(
  `android/build.gradle updated → version '${version}', versionName "${version}", versionCode ${versionCode}`,
);
