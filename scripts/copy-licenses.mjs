import { copyFileSync } from 'node:fs';

for (const name of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
  copyFileSync(new URL(`../${name}`, import.meta.url), name);
}
