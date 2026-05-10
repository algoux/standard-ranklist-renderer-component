import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const browserEntryPath = resolve(packageDir, 'dist/index.browser.js');

writeFileSync(browserEntryPath, "import './style.css';\nexport {};\n");