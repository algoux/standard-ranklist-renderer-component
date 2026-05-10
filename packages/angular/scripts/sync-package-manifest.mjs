import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJsonPath = resolve(packageDir, 'package.json');
const builtPackageJsonPath = resolve(packageDir, 'dist/package.json');

const sourcePackage = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const builtPackage = JSON.parse(readFileSync(builtPackageJsonPath, 'utf8'));

builtPackage.private = false;
builtPackage.description = sourcePackage.description;
builtPackage.main = './fesm2022/algoux-standard-ranklist-renderer-component-angular.mjs';
builtPackage.module = './fesm2022/algoux-standard-ranklist-renderer-component-angular.mjs';
builtPackage.types = './index.d.ts';
builtPackage.typings = './index.d.ts';
builtPackage.sideEffects = false;
builtPackage.publishConfig = sourcePackage.publishConfig;

writeFileSync(builtPackageJsonPath, `${JSON.stringify(builtPackage, null, 2)}\n`);