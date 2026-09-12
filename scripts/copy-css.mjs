import { cpSync, statSync } from 'node:fs';

// Mitosis CLI は CSS をコピーしないため、生成したコンポーネントと同じ場所に置く。
for (const framework of ['vue', 'react']) {
  cpSync(
    new URL('../components', import.meta.url),
    new URL(`../packages/${framework}/src/generated/components`, import.meta.url),
    {
      recursive: true,
      filter: (source) => statSync(source).isDirectory() || source.endsWith('.css'),
    },
  );
}
