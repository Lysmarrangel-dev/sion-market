import fs from 'node:fs';
import path from 'node:path';

/** apps/backend, whether running from dist/ or dist-test/. */
export const PACKAGE_ROOT = (() => {
  let dir = import.meta.dirname;
  while (!fs.existsSync(path.join(dir, 'package.json'))) dir = path.dirname(dir);
  return dir;
})();
