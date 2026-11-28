# Koyori UI

Koyori のプロジェクトで共有する UI コンポーネントライブラリです。[Mitosis](https://mitosis.builder.io/) の共通ソースから Vue 3・React 19 向けのパッケージを生成しています。

## パッケージ

| パッケージ | 対象 | 配布状況 |
| --- | --- | --- |
| [`@koyori-app/ui-vue`](packages/vue) | Vue 3.5+ | [npm](https://www.npmjs.com/package/@koyori-app/ui-vue) で公開中 |
| [`@koyori-app/ui-react`](packages/react) | React 19+ | リポジトリ内パッケージ（未公開） |

## 導入方法

### Vue

```sh
pnpm add @koyori-app/ui-vue
```

エントリーポイントなどでスタイルを読み込み、コンポーネントをインポートして使用します。

```vue
<script setup lang="ts">
import '@koyori-app/ui-vue/style.css';
import { Button } from '@koyori-app/ui-vue';
</script>

<template>
  <Button label="作成" />
</template>
```

### React

`@koyori-app/ui-react` はまだ npm に公開していないため、このリポジトリからパッケージを作成するか workspace 参照で利用します。

```sh
pnpm install --frozen-lockfile
pnpm --filter @koyori-app/ui-react pack --pack-destination /tmp/koyori-ui-packages
```

```tsx
import '@koyori-app/ui-react/style.css';
import { Button } from '@koyori-app/ui-react';

export function App() {
  return <Button label="作成" />;
}
```

### テーマとトークン

- 既定はダークテーマです。`<html>` などの祖先要素に `data-theme="light"` を付けるとライトテーマに切り替わります。
- ユーザーによる切り替えには `ThemePicker` / `ThemeSwitch` と `themeScript` を利用できます。
- 色・角丸・余白などの CSS カスタムプロパティは [components/tokens.css](components/tokens.css) で定義されており、`style.css` の読み込み後に上書きできます。

## ドキュメントと開発

各コンポーネントのデモ・API・キーボード操作は `apps/docs`（Astro + Starlight）と各パッケージの Storybook にまとめています。

開発には Node.js 24 と pnpm 12.4.1 が必要です。

```sh
pnpm install --frozen-lockfile

pnpm dev:docs         # ドキュメントサイト (http://localhost:4321)
pnpm storybook:vue    # Vue Storybook (http://localhost:6006)
pnpm storybook:react  # React Storybook (http://localhost:6007)

pnpm generate         # components/ から Vue・React ソースを生成
pnpm typecheck        # 型チェック
pnpm build            # 全パッケージをビルド
```

ディレクトリ構成・検証スクリプト・VRT CI・リリース手順などの詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## ライセンス

[MIT License](LICENSE)

第三者由来のコードおよび素材については [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。
