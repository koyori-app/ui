import { readFileSync } from 'node:fs';

/* ライブラリのビルドは new URL(…, import.meta.url) のアセットを data: URL にして index.js に埋め込む。
   絵文字データは別ファイルのまま配り、式は利用側のバンドラーに解決させるので、ここでは式を触らせずファイルだけ出す。 */
const EXPRESSION = "new URL('./emoji-data.json', import.meta.url)";
const MARKER = '__KOYORI_EMOJI_DATA_URL__';

export function emojiDataAsset() {
  let source = null;
  let active = false;
  return {
    name: 'koyori-emoji-data-asset',
    apply: 'build',
    enforce: 'pre',
    configResolved(config) {
      active = Boolean(config.build.lib);
    },
    transform(code, id) {
      if (!active || !code.includes(EXPRESSION)) return null;
      source = readFileSync(new URL('./emoji-data.json', `file://${id.split('?')[0]}`));
      return { code: code.replaceAll(EXPRESSION, MARKER), map: null };
    },
    renderChunk(code) {
      return active && code.includes(MARKER) ? { code: code.replaceAll(MARKER, EXPRESSION), map: null } : null;
    },
    generateBundle() {
      if (!active) return;
      if (!source) this.error('emoji-data.json を読む式が見つからない');
      this.emitFile({ type: 'asset', fileName: 'emoji-data.json', source });
    },
  };
}
