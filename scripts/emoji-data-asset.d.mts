/** IconPicker の絵文字データを、ライブラリのビルドで index.js に埋め込まず dist/emoji-data.json として出す Vite のプラグイン。 */
export function emojiDataAsset(): { name: string; apply: 'build'; enforce: 'pre' };
