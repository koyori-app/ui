# コントリビューション・開発ガイド

Koyori UI の開発・検証・ドキュメント編集・CI・リリース手順をまとめています。
アクセシビリティ・角丸・ホバーの動きなどの設計指針は [AGENT.md](AGENT.md) を参照してください。

## 開発環境

Node.js 24 と pnpm 12.4.1 を使用します。

```sh
pnpm install --frozen-lockfile
pnpm storybook:vue    # http://localhost:6006
pnpm storybook:react  # http://localhost:6007（別ターミナル）
pnpm dev:docs         # http://localhost:4321
pnpm typecheck
pnpm build
pnpm build-storybook
pnpm build:docs
```

| パッケージ | ディレクトリ | Storybook 出力 |
| --- | --- | --- |
| `@koyori-app/ui-vue` | `packages/vue/src` | `packages/vue/storybook-static` |
| `@koyori-app/ui-react` | `packages/react/src` | `packages/react/storybook-static` |

## ディレクトリ構成と実装ルール

- 共通コンポーネントとスタイルは `components/<コンポーネント名>/` に置きます（例: `components/Picker/Picker.lite.tsx`、`components/Picker/picker.module.css`）。
- 複数のコンポーネントが共有するスタイル・計算処理は `components/shared/` に置きます。
- 共通の型宣言 `css.d.ts` は `components/` 直下に置きます。
- 変更後に `pnpm generate` を実行すると、`packages/{vue,react}/src/generated` が更新されます。Storybook 起動中もこのコマンドで変更を反映できます。**生成物は直接編集・コミットしません。**
- Story は各パッケージの `src/*.stories.*` に追加します。
- ビルドは ESM・型定義・CSS を `dist` に出力します。共通トークンはバンドル時にまとめられ、配布 CSS 内では 1 回だけ定義されます。

### デザイントークンとテーマ

- 角丸・文字サイズ・行高・余白・最小高さ・色・影・フォーカス・モーション・メニュー配置・スピナー周期の共通トークンは [components/tokens.css](components/tokens.css) で管理します。
- 既定はダークテーマで、祖先に `data-theme="light"` を付けるとライトテーマに切り替わります。
- `ThemePicker` / `ThemeSwitch` と `themeScript` による選択状態は `localStorage` の `koyori-theme` に保持し、`html[data-theme]` は常に `light` か `dark` の 2 値とします。

### アイコンと絵文字データ

- アイコンは [Lucide](https://lucide.dev/) から必要な SVG を Mitosis の共通コンポーネントとして取り込みます。追加時は出典・コミット・ライセンスを [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) に記録してください。
- `IconPicker` の絵文字データは `emojibase-data` の日本語データから `pnpm emoji-data`（`scripts/build-emoji-data.mjs`）で `components/IconPicker/emoji-data.json` に生成します。生成物の一致確認は `node scripts/build-emoji-data.mjs --check` で実行できます（CI でも実行されます）。

## 検証スクリプト

`scripts/check-*.cjs` に各種検証スクリプトを用意しています。

### ブラウザーなしの検証

`pnpm build`（または `pnpm generate` と `pnpm --filter './packages/*' build`）の後に実行できます。CI の [Check ワークフロー](.github/workflows/check.yml) でも主要な検証を実行しています。

```sh
node scripts/build-emoji-data.mjs --check
node scripts/check-mention.cjs
node scripts/check-theme-picker.cjs
node scripts/check-theme-switch.cjs
node scripts/check-combobox-logic.cjs
node scripts/check-picker-logic.cjs
node scripts/check-tree-logic.cjs
node scripts/check-sidebar.cjs
node scripts/check-sidebar-link.cjs
node scripts/check-dialog.cjs
node scripts/check-field-data-list.cjs
node scripts/check-dropdown-item-icon.cjs
node scripts/check-calendar.cjs
node scripts/check-progress-bar.cjs
node scripts/check-meter.cjs
node scripts/check-context-menu.cjs
node scripts/check-breadcrumb.cjs
node scripts/check-skeleton.cjs
node scripts/check-spinner.cjs
node scripts/check-alert.cjs
node scripts/check-toaster.cjs
node scripts/check-switch.cjs
node scripts/check-password-input.cjs
node scripts/check-pagination.cjs
node scripts/check-card-separator.cjs
```

### ブラウザー検証（Playwright）

Storybook やドキュメントのビルド後に、各コンポーネントの操作・配置・アクセシビリティ（axe）を検証できます。

- 前提: Playwright・Chromium・日本語フォント・Python 3 が必要です。
- 別の場所にある Playwright を使う場合は、環境変数 `PLAYWRIGHT_MODULE` にモジュールパスを指定してください。
- 一部のスクリプトは `<NAME>_TEST_PORT`（ポート変更）や `<NAME>_TEST_FRAMEWORK=vue|react`（対象フレームワーク絞り込み）に対応しています。

```sh
pnpm build-storybook
node scripts/check-button.cjs
node scripts/check-dropdown.cjs
node scripts/check-picker.cjs
node scripts/check-navigation.cjs
node scripts/check-input.cjs
node scripts/check-touch-narrow.cjs
node scripts/check-tooltip.cjs
node scripts/check-hover-card.cjs
node scripts/check-icon-rail.cjs
node scripts/check-user-panel.cjs
node scripts/check-date-picker.cjs
node scripts/check-checkbox.cjs
node scripts/check-data-list.cjs
node scripts/check-inline-edit.cjs
node scripts/check-combobox.cjs
node scripts/check-tag-badge.cjs
node scripts/check-tree.cjs
node scripts/check-tabs.cjs
node scripts/check-split-pane.cjs
node scripts/check-icon-picker.cjs
node scripts/check-components.cjs

pnpm build:docs
node scripts/check-migration.cjs
```

## Web ドキュメント

Astro + Starlight によるドキュメントサイトを `apps/docs` に置いています。

- ページは `apps/docs/src/content/docs`、デモは `apps/docs/src/examples` で編集します。
- 複数コンポーネントを組み合わせた例は `apps/docs/src/content/docs/blocks` に置きます。
- 共通コンポーネントを変更した後は `pnpm dev:docs` を起動し直すと、生成とパッケージビルドが反映されます。
- `pnpm preview:docs` で本番ビルド後のサイト（サイト内検索を含む）をローカル確認できます。
- [Docs CI](.github/workflows/docs.yml) は PR・main への push・手動実行でビルドと型検査を行います。静的ホスティングではリポジトリルートから `pnpm build:docs` を実行し、`apps/docs/dist` を出力ディレクトリに指定します。

## VRT CI

[VRT ワークフロー](.github/workflows/vrt.yml) は PR・main への push・手動実行で Vue / React それぞれを生成・型検査・ビルドし、Storybook を [Koyori VRT](https://vrt.koyori.app) へ送信します。Fork・Dependabot の PR ではビルドまで実行し、VRT への送信は省略します。

実行前に GitHub リポジトリの **Settings → Secrets and variables → Actions** に以下を設定してください。

| 種類 | 名前 | 値 |
| --- | --- | --- |
| Secret | `VRT_TOKEN` | 両プロジェクトにアクセスできる PAT（`write:build`・`read:build` スコープが必要） |
| Variable | `VRT_PROJECT_VUE` | Vue 用の `tenant-slug/project-slug`（例: `koyori/ui-vue`） |
| Variable | `VRT_PROJECT_REACT` | React 用の `tenant-slug/project-slug`（例: `koyori/ui-react`） |

- VRT 側で Vue / React それぞれ独立した 2 つのプロジェクトを作成し、比較基準ブランチを `main` に設定してください（同一プロジェクトの指定は CI で拒否されます）。
- 初回は `main` のビルドを実行し、VRT 上で結果を確認・承認して比較基準を用意します。

## リリース（公開）

`@koyori-app/ui-vue` は npm に公開します。

1. `packages/vue/package.json` の `version` を上げて `main` に取り込みます。
2. `v<version>` のタグを作成して push すると、[tag-release.yml](.github/workflows/tag-release.yml) が GitHub Release の draft を作成します。
3. 内容を確認して Release を公開すると、[release.yml](.github/workflows/release.yml) が npm に publish します（npmjs.com に Trusted Publisher として登録済みのリポジトリ + workflow から OIDC 認証）。

※ 初版のみ手元で `pnpm --filter @koyori-app/ui-vue publish` を実行したうえで Trusted Publisher を登録します。
配布物（`LICENSE` と `THIRD_PARTY_NOTICES.md` を含む tarball）の事前確認は `pnpm --filter @koyori-app/ui-vue pack`（React は `ui-react`）で行えます。

## ライセンスと第三者コードの扱い

- 独自コードは [MIT License](LICENSE) で提供します（著作権者: yupix・sousuke0422）。`task`・`vrt` から移すコードも、両者が権利を持ち MIT での提供に合意した部分を対象とします。
- 第三者由来のコードには元のライセンスが適用されます。コピーや移植を行う場合も元の著作権表示・ライセンス文を保持し、出典・対象ファイル・取り込み元コミットを [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) に記録してください。
- npm パッケージなどを配布する際は、各配布物に `LICENSE` と対応する第三者コードの著作権表示・ライセンス文（`THIRD_PARTY_NOTICES.md`）を同梱します。フォント・アイコンなどの素材もそれぞれのライセンスに従います。
