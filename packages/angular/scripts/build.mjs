import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJsonPath = resolve(packageDir, 'package.json');
const sourcePackageText = readFileSync(packageJsonPath, 'utf8');
const ngPackagrPackage = JSON.parse(sourcePackageText);

delete ngPackagrPackage.exports;

let result;

try {
  writeFileSync(packageJsonPath, `${JSON.stringify(ngPackagrPackage, null, 2)}\n`);
  result = spawnSync('ng-packagr', ['-p', 'ng-package.json'], {
    cwd: packageDir,
    stdio: 'inherit',
  });
} finally {
  writeFileSync(packageJsonPath, sourcePackageText);
}

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status || 1);
}

await import('./sync-package-manifest.mjs');
