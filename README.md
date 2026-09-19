# Koyori UI

Koyori のプロジェクトで共有する UI。Mitosis の共通ソースから Vue・React 向けのコンポーネントを生成します。

## 開発

Node.js 24 と pnpm 12.4.1 を使います。

```sh
pnpm install --frozen-lockfile
pnpm storybook:vue    # http://localhost:6006
pnpm storybook:react  # http://localhost:6007（別ターミナル）
pnpm typecheck
pnpm build
pnpm build-storybook
```

| パッケージ | ディレクトリ | Storybook 出力 |
| --- | --- | --- |
| `@koyori-app/ui-vue` | `packages/vue/src` | `packages/vue/storybook-static` |
| `@koyori-app/ui-react` | `packages/react/src` | `packages/react/storybook-static` |

共通の実装とスタイルは `components/<コンポーネント名>/` にまとめます。
例えば Picker は `components/Picker/Picker.lite.tsx` と `components/Picker/picker.module.css` に置きます。
複数の部品が使うスタイル・計算は `components/shared/` に置きます。
アイコンも同じ構成にし、共通の型宣言 `css.d.ts` は `components/` 直下に置きます。
変更後に `pnpm generate` を実行すると、`packages/{vue,react}/src/generated` が更新されます。
Storybook 起動中もこのコマンドで変更を反映できます。生成物は直接編集・コミットしません。
Story は各パッケージの `src/*.stories.*` に追加します。

角丸・文字サイズ・行高・余白・最小高さ・色・影・フォーカス・モーション・メニュー配置の共通トークンは [components/tokens.css](components/tokens.css) で管理します。
各コンポーネントが参照し、生成先と配布用の `style.css` にも含まれます。
Button・Dropdown・Picker・Accordion・SidebarLink は `sm`（14px 相当）の文字と 36px の最小高さ、操作要素の角丸は `md`（8px）を使います。
配色はくすんだラベンダーとセージを使い、背景に色を持たせながら文字は濃く保ちます。
主ボタン・ホバー・選択背景はラベンダーの濃淡で揃え、選択時はホバーより少し濃くします。
補助ボタンはセージ、選択チェックは丸背景のない濃い紫です。
選択背景とチェックの色は `--koyori-color-selection` と `--koyori-color-selection-indicator` で調整できます。
カードなど角丸のある要素を入れ子にする場合は、外側の角丸を `内側の角丸 + 外側の padding` にします。
Dropdown のパネルは `calc(var(--koyori-radius-md) + var(--koyori-space-xs))`（既定値: 8px + 4px = 12px）です。
計算は外側の要素で行い、その範囲で内側の角丸や余白を上書きした場合も追従させます。
文字サイズは `rem`、行高は倍率なので、利用側のルート文字サイズに追従します。
共通値はここで変更し、利用側で調整するときは `style.css` の読み込み後に上書きします。
`:root` なら全体、親要素のクラスならその範囲だけに適用できます。

```css
.settings-panel {
  --koyori-radius-md: 6px;
  --koyori-font-size-sm: 1rem;
}
```

Button は `variant="primary" | "secondary" | "tertiary" | "ghost" | "danger"` で切り替えます（既定値: `primary`）。
`danger` は削除など取り消せない操作に使い、ラベルにも結果が分かる言葉を入れてください。
各種類の通常・無効状態の Story と、Docs・アクセシビリティ確認用のアドオンを用意しています。
共通 CSS で hover 時の色の遷移と押下時の縮小を実装し、`prefers-reduced-motion` に対応しています。
押下時は内側の背景・ラベルだけを縮め、外側の寸法・クリック領域・フォーカス枠を維持します。
アイコンは React では `icon={<EllipsisIcon size={16} />}`、Vue では `#icon` スロットで渡し、ラベルの前に表示します。
`label` を省略するとアイコンだけの正方形のボタンになります。その場合は `ariaLabel`（Vue も `ariaLabel`）で名前を付けてください。
`label` がなければ `ariaLabel` を必須にする型を React・Vue の両方で公開します。空文字は避けてください。
UI の開発では [アクセシビリティの指針](AGENT.md) を参照してください。

ButtonGroup は子の Button をつなげ、隣り合う枠線を1本に重ねて外側の角だけを丸めます。
`label` を `role="group"` の `aria-label` に使います。グループ内では押下時の縮小を止めます。

Accordion は `id`・`label` と本文を受け取る開閉セクションです。`id` はページ内で一意にします。
`defaultOpen` は初期表示、`open` と `onOpenChange` は外側からの制御に使います。省略時は各セクションが独立して開閉します。
同時にひとつだけ開く例は Storybook の SingleOpen、複数を開く例は MultipleOpen にあります。
`headingLevel`（既定 3）で見出し階層、`disabled` で操作の無効化、`icon`（Vue は `#icon`）で先頭アイコンを指定できます。
Enter / Space で開閉し、閉じた内容は Tab 移動・読み上げから除きます。本文の DOM と入力内容は保持します。

Sidebar は `label` をナビゲーションの名前にし、`header`・`footer`（Vue は同名スロット）と本文を縦に並べます。
SidebarLink の `label`・`href` でページ移動、`current` で現在地、`badge` で補足、`disabled` で移動の無効化を指定します。
アイコンは `icon`（Vue は `#icon`）で渡します。通常のリンクなので新しいタブでも開け、現在地はアプリの URL から渡します。
本文に Accordion を置くとグループを開閉できます。幅は `--koyori-sidebar-width`（240px）、高さは親要素で指定します。
`open`（と `id`）を渡すと開閉でき、閉じると幅（`placement` が `top`・`bottom` なら高さ、既定 `--koyori-sidebar-height`）を 0 まで畳んで隣の領域を広げます。
開閉ボタンは Button の `ariaExpanded`・`ariaControls` で状態と対象を伝え、閉じるときに中にあったフォーカスはそのボタンへ戻します。
`rail` を渡すと `--koyori-sidebar-rail-width`（64px）まで縮み、アイコンだけの表示になります。ラベルと badge は見た目だけ隠し、読み上げ名は保ちます。
`open` と組み合わせると、展開・アイコンだけ・完全に閉じるの 3 状態になります。レールで使うリンクには `icon` を渡してください。
`onRailChange` を渡すと端から張り出すつまみが出て、押すと rail を反転します。状態は `aria-pressed`、名前は `railLabel` です。
項目が多い場合はナビゲーション部分だけがスクロールします。Accordion 本文の余白は `--koyori-accordion-padding` で変更できます。

Avatar は利用者を表す円形の画像です。`name`・`src`・`size`（既定: 32px）を受け取ります。
`src` がない場合と読み込みに失敗した場合はイニシャルを表示し、読み上げは常に `name` になります。
イニシャルは空白区切りの語の先頭を2つまで使います（「山田 太郎」→「山太」、「山田太郎」→「山」）。
直径と文字サイズの計算・イニシャルの算出は `components/Avatar/avatar.ts` にまとめ、AvatarGroup と共有します。

AvatarGroup は `items: { name, src? }[]` を少し重ねて並べ、`max` を超えた分を `+N` にまとめます。
`label` を `role="group"` の `aria-label`、`formatOverflow(count)` を `+N` の読み上げ文（既定: `他 N 人`）に使います。
重なりは 8px、隣との境界は `--koyori-color-surface` の縁取りで作るため、背景の異なる場所ではこの値を合わせてください。

Dialog はネイティブの `dialog` 要素と `showModal()` を使うモーダルです。`open`・`title`・`description`・`onClose` を受け取り、
本文は既定スロット、操作ボタンは `actions`（Vue は `#actions` スロット）に置きます。表示状態はアプリ側で持ち、`onClose` で false に戻します。
フォーカスの閉じ込め・背景の操作停止・Escape・フォーカス復帰はブラウザーに任せ、`open` 属性はバインドしません（非モーダルになるため）。
背景クリックは pointerdown の対象が dialog 自身のときだけ閉じ、開いている間は `body:has(dialog:modal)` で背景のスクロールを止めます。
幅は `--koyori-dialog-width`、覆いの色は `--koyori-color-backdrop`、角丸は内側のボタンの角丸 + `--koyori-space-xl` です。
中身が自前でレイアウトを持つ場合は `plain` を使います。見出しと説明は読み上げにだけ残し、内側の余白を外して本文が全面に広がります。
幅と高さ（`--koyori-dialog-height`、既定 `auto`）はダイアログを囲む要素で指定します。2 列の組み方は Web ドキュメントのブロックに載せています。

Drawer は画面端から滑り出るモーダルで、ハンバーガーボタン（Button + `MenuIcon`）で開閉するナビゲーションなどに使います。
`open`・`label`・`placement`（`left` 既定、`right`・`top`・`bottom`）・`onClose` を受け取り、開閉は Dialog と同じ `syncDialog` で同期します。
画面端に付き、内側の角だけが丸くなります。開閉とも弾まないスライドで、閉じるアニメーションは `transition-behavior: allow-discrete` 対応ブラウザーだけで動きます。
幅は `--koyori-drawer-width`（280px）、上下の高さは `--koyori-drawer-height`（60vh）です。中の Sidebar が `rail` のときは `--koyori-sidebar-rail-width` に縮みます。
`modal` に `false` を渡すと `dialog` を使わず中身をその場所に描くため、広い画面では常時表示、狭い画面ではモーダル、という出し分けを同じ記述でできます。中の Sidebar は `--koyori-sidebar-border`・`--koyori-sidebar-radius` で枠と角丸を外します。

ConfirmDialog は Dialog と Button を組み合わせた二択の確認です。`title`・`message`・`confirmLabel` は必須で、
`destructive` で実行ボタンを danger にします。キャンセルを先頭に置くため、初期フォーカスは常に取り消し側です。

Field は `id`・`label`・`description`・`error`・`required` を受け取り、中の Input（1行）・Textarea（複数行）・Picker（選択）に渡します。Field 内には対象を1つだけ置きます。
`id` は入力欄に付き、ラベルの `for` と説明・エラーの `aria-describedby` に使います。エラーがあると `aria-invalid="true"` を付けます。
エラー領域は常設の `aria-live="polite"` で、後から出たエラーも通知します。`requiredText` で「必須」の表示を差し替えられます。
Picker ではトリガーに Field の `id` が付き、`requiredText` を名前に含めて閉じた状態でも必須を伝えます。
説明・エラーの `aria-describedby` はトリガーにだけ付けます。一覧は `aria-required` と `aria-invalid` で状態を伝えます。必須チェックと送信値の管理はアプリ側で行います。
Input・Textarea の値は `value` と `onValueChange(value)` で扱い、入力のたびに呼ばれます。Field の外で使う場合は `ariaLabel` で名前を付けます。
入力欄の枠線は `--koyori-color-border-strong`（背景比 3:1 以上）、エラーは `--koyori-color-danger`（4.5:1 以上）を使います。

Dropdown はアクションメニューです。`label` と `items: { value, label, disabled? }[]` を渡し、
項目を実行すると閉じて `onSelect(value)` を呼び出します。選択状態は持ちません。`value` は一覧内で一意にしてください。
`disabled` で全体を無効化し、`defaultOpen` で初期表示を開けます。`emptyMessage` で空表示を変更できます。
トリガーは `aria-haspopup="menu"` と `aria-controls`、一覧は `menu`、項目は `menuitem` を使います。
Enter・Space・↓ は先頭、↑ は最後へフォーカスを移して開きます。上下キー・Home・End・先頭文字で移動できます。
無効な項目も矢印キーでフォーカスできますが、実行はできません。
Tab / Shift + Tab は閉じて次・前の操作へ移動し、Escape は閉じてトリガーへ戻ります。外側クリックでも閉じます。
Storybook の Actions で実行通知と Tab 移動を確認できます。

Picker は単一・複数選択用です。`label` と `items: { value, label, disabled? }[]` を渡します。
検索は既定で有効です。`searchable={false}`（Vue: `:searchable="false"`）で検索欄を省略できます。
単一選択は選ぶと閉じ、`selectionMode="multiple"` は選択・解除しても開いたままです。
`avatars` を付けると、選択肢の先頭に 24px の Avatar を出します。画像は `items` の `src`、なければイニシャルです。
行の上下の余白を詰めて高さは 36px のままにし、アバターは装飾として読み上げから外します。選択肢の名前は `label` のままです。
トリガーの表示は `trigger`（React の要素、Vue は `#trigger` スロット）で差し替えられます。
アバターなどを置いても、開閉・キーボード操作・読み上げ名（`label` と選択中のラベル）はそのままです。
中身は `button` の内容として正しい要素にしてください（AvatarGroup のルートは `span` です）。
選んだラベルはトリガーとアクセシブルネームに反映します。`label` は選ぶ対象の名前として固定してください。
`selectedValues: string[]` と `onSelectionChange(values)` で外側から状態を管理できます。
省略すると内部で管理し、初期値は `defaultSelectedValues` です。
存在しない値は表示から除き、単一選択では項目順で先頭の1件を使います。単一選択の解除は外側から空配列を渡します。
検索で見えなくなった項目の選択も保持します。検索はラベルの部分一致で、大文字・小文字と全角・半角を揃えます。
開き直すと検索文字列をクリアします。`searchPlaceholder`・`searchLabel`・`emptyMessage` で文言を差し替えられます。
候補数の通知は入力が300ms止まってから更新します。候補と空表示はすぐ更新し、閉じると保留中の通知を取り消します。
`formatResultsCount(count)` は候補数の通知文、`selectionSeparator` は複数の選択ラベルの区切り（既定: `、`）です。
一覧は `listbox` で、上下キー・Home・End・先頭文字で移動し、Enter / Space で選択、Escape で閉じます。
検索ありなら開くと検索欄にフォーカスし、検索なしなら現在の選択項目（なければ先頭の有効な項目）に移ります。
チェックと背景はアニメーションし、隣の選択済み項目から背景が伸びてつながります。
Storybook の WithoutSearch・MultipleWithoutSearch・ControlledWithoutSearch・AdjacentSelection で検索なしの選択を確認できます。

候補の選択・隣接状態は `get view()` にまとめています。Vue は computed として共有し、React は参照ごとに再計算します。
各計算は候補数に比例し、1,001 件の Story で検索・選択を確認できます。
全候補の DOM を描画するため、数万件のデータはアプリ側で検索・分割してください。

Button と両トリガーは `components/shared/control.module.css` を共有し、通常のトリガーには ghost の見た目を使います。
Field 内の Picker は Input と同じ枠線・背景・エラー色を持ち、Field の幅に揃います。パネル幅は独立しています。
フォーカスは共通の `--koyori-focus-*`、無効背景は `--koyori-color-surface-disabled`、
動きは `--koyori-motion-fast/base/slow` と `--koyori-ease-out/pop` を使います。
一覧と検索欄のフォーカス枠だけは、スクロール領域で切れないよう内側に置きます。

Dropdown と Picker のパネル・項目は `components/shared/menu.module.css`、
配置・検索文字の正規化・外側クリック等のリスナーは `components/shared/menu.ts` にまとめています。
Dropdown・Picker・Sidebar は `components/shared/highlight.ts` と `highlight.module.css` を共有し、マウスの入った位置から背景が広がって項目間を移動します。ホバーできない端末（スマホなど）では、タップの瞬間に動いて見えないよう、背景を動かさずその場に表示します。Sidebar 内の Accordion の見出しと入れ子のリンクも同じ動きになり、現在地の色は保ちます。
`--koyori-menu-width`（200px）・`--koyori-menu-max-height`（360px）・`--koyori-menu-gap`（8px）・
`--koyori-menu-viewport-margin`（8px）・`--koyori-z-menu`（10）で配置を調整できます。
配置計算に使う最大高・間隔・画面端の余白は、ブラウザーで長さを解決するため `rem`・`calc()` でも指定できます。長さの計測は開くときだけ行い、スクロール・リサイズ時は再利用します。開いている間にこれらの値を変更した場合は、開き直すと反映されます。
文字入力の連結待ちは `MENU_TYPEAHEAD_TIMEOUT`（500ms）に集約しています。
メニュー幅は親から独立し、狭い画面では縮小して長い項目を折り返します。
下に収まらず上の空きが広い場合は上に開き、両側とも足りなければ高さを制限して一覧をスクロールします。
開いている間のリサイズ・スクロールにも追従します。親要素の `overflow: hidden` 等による切り取りは回避しません。
アイコンは回転しません。未指定では矢印、`icon={null}`（Vue: `:icon="null"`）で非表示です。
React では `icon={<EllipsisIcon />}`、Vue では `<template #icon><EllipsisIcon /></template>` で差し替えます。
マウスが入った位置から背景が広がり、その後は項目間を移動します。動きを減らす設定ではアニメーションを停止します。
背景色の上書きは引き続き `--dropdown-hover-background`、Picker の選択背景は `--dropdown-selected-background` を使えます。

以前 Dropdown の選択モードを使っていた箇所は、コンポーネントを Picker に置き換えて `searchable={false}` を指定します。
`selectionMode`・`selectedValues`・`defaultSelectedValues`・`onSelectionChange` は Picker に移しました。
`onSelect` は Dropdown の操作実行専用です。選択値の変更通知には Picker の `onSelectionChange` を使ってください。
単一選択は「選択すると閉じる」動作に統一し、トリガーの表示文言は Picker が更新します。
ブラウザー検証は Storybook のビルド後に `node scripts/check-picker.cjs` で実行します（Dropdown と同じ実行環境）。

アイコンは [Lucide](https://lucide.dev/) の必要な SVG を Mitosis の共通コンポーネントとして取り込みます。
`ChevronDownIcon`・`EllipsisIcon`・`CheckIcon`・`XIcon`・`MenuIcon` を公開し、Dropdown の既定の矢印には `ChevronDownIcon` を使っています。
`XIcon` はダイアログの閉じるボタンなどに使います。`MenuIcon` は Drawer を開くボタンに使います。アイコンだけのボタンには `ariaLabel` で名前を付けてください。
`size` で縦横のサイズを指定できます（既定値: 16px）。色は親の `color` を引き継ぎます。
装飾用として読み上げから除外するため、アイコンだけのボタンにはボタン側で `aria-label` を付けてください。
アイコンを追加するときは出典・コミット・ライセンスを `THIRD_PARTY_NOTICES.md` に記録します。

ビルドは ESM・型定義・CSS を `dist` に出力します。
利用側ではコンポーネントと `@koyori-app/ui-vue/style.css` または
`@koyori-app/ui-react/style.css` を import します。共通トークンはバンドル時にまとめられ、配布 CSS 内では1回だけ定義されます。
`pnpm --filter @koyori-app/ui-vue pack`（React は `ui-react`）で、ライセンスを含む配布物を生成できます。

ブラウザー検証は Storybook のビルド後に `node scripts/check-dropdown.cjs` で実行します。
`node scripts/check-picker-logic.cjs` はブラウザーなしで選択計算を検証します。
`node scripts/check-sidebar.cjs` は、ブラウザーなしで Sidebar の開閉・フォーカスの戻し先・Button の開閉用属性・配布 CSS の規則を検証します（`pnpm build` のあとに実行）。
`node scripts/check-dialog.cjs` は、ブラウザーなしで Dialog の開閉同期・生成物の構造・配布 CSS の規則を検証します（`pnpm build` のあとに実行）。
`node scripts/check-components.cjs` は Field 連携・文言・共通スタイル・大量候補を検証します。
`node scripts/check-navigation.cjs` は Accordion の開閉・キーボード操作・入力保持、Sidebar のリンク・現在地・スクロールを両フレームワークのブラウザーで検証します。
Playwright と Chromium、日本語フォント、および Python 3 が必要です。別の場所にある Playwright を使う場合は
`PLAYWRIGHT_MODULE` にモジュールのパスを指定してください。

## Calendar

`Calendar` は月のカレンダーをページ内に表示し、1 日を選びます。値は `'YYYY-MM-DD'` の文字列で、
`value`・`defaultValue`・`onValueChange` で扱います。`min`・`max`・`isDateDisabled` で選べる日を絞り、
`locale`・`firstDayOfWeek` で表示を合わせます。キーボード操作は W3C の Date Picker の例に合わせています。
[使い方とプレビュー](apps/docs/src/content/docs/components/calendar.mdx)を参照してください。
日付の計算は `components/Calendar/calendar.ts` にまとめ、`node scripts/check-calendar.cjs` でブラウザーなしに検証します（`pnpm build` のあとに実行）。

## Checkbox

`Checkbox` は `label` を必須にし、`hideLabel` で読み上げ名を保ったまま表示ラベルを隠せます。
`checked` と `onCheckedChange` で状態を管理でき、省略時は標準の入力要素に任せます。
チェック時は SVG の線を描画し、外枠や操作領域のサイズは変えません。動きを減らす設定にも対応します。
[使い方とプレビュー](apps/docs/src/content/docs/components/checkbox.mdx)を参照してください。
Storybook のビルド後に `node scripts/check-checkbox.cjs` で操作と描画を検証できます。

## DataList

`DataList` と `DataListRow` で、列の揃った一覧を組み立てます。各 DataList が1グループになり、
見出し・件数・折り畳み、行の選択表示、空・読み込み中・エラー・再試行を扱えます。
セルは通常の `td` / `th scope="row"` で渡し、Button・Avatar・Picker などを組み合わせます。
データ取得・更新・ソート・グループ分けは利用側で管理します。
DataList 内の Dropdown・Picker は Popover API 対応ブラウザーで一覧の枠外にも表示できます。
仕様と実行できる Vue／React の例は [DataList のページ](apps/docs/src/content/docs/components/data-list.mdx) にあります。
Storybook のビルド後に `node scripts/check-data-list.cjs` で操作とアクセシビリティを検証できます。

ProgressBar は達成率や進捗を横棒で示す表示専用の部品です。`label`・`value`・`max`（既定 100。0 以下や非有限な値は 100 扱い）を受け取り、
`valueText` で「3 / 5 件」のような表示と読み上げに差し替えられます。`hideLabel`・`hideValue` で表示を省けます。
`role="progressbar"` と `aria-valuenow`・`aria-valuemax`・`aria-valuetext` で値を伝え、値の変化は読み上げません。
高さは `--koyori-progress-height`（8px）、色は棒の要素で `--progress-fill`・`--progress-track` を上書きします。
満たしたときは `data-complete="true"` が付きます。値の計算は `components/ProgressBar/progress.ts` にまとめ、
`node scripts/check-progress-bar.cjs` でブラウザーなしに検証します（`pnpm build` のあとに実行）。

ContextMenu は右クリック（キーボードは Shift+F10・メニューキー）で開く操作メニューです。`open`・`x`・`y`・`label`・`items`・`onSelect`・`onClose` を受け取り、
座標と開閉はアプリが持ちます。座標は `contextMenuPosition(event)` で取得し、キーボード起動のときは対象の左下を返します。
配置・外側クリック・トップレイヤーは Dropdown と同じ `components/shared/menu.ts` を使い、矢印キーと先頭文字の移動は
`nextMenuIndex`・`typeaheadTarget` として共有します。項目の `destructive` は danger の色になります（ラベルにも結果を書くこと）。
項目に `items` を渡すと 1 階層だけサブメニューを持てます。サブメニューは右に入らなければ左へ反転し、下にはみ出せば上へずれます。
右クリックできない利用者（スマホなど）のために、三点ボタンからも同じ ContextMenu を開いてください。`menuButtonPosition(event)` がボタンの左下の座標を返し、
ボタンの `ariaControls` と ContextMenu の `id` を揃えると、開いている間のボタンの押下で閉じます。Button には `ariaHasPopup` を足しました。`node scripts/check-context-menu.cjs` で
ブラウザーなしに移動・座標・生成物・配布 CSS を検証します（`pnpm build` のあとに実行）。

Breadcrumb は階層の位置を示し、上の階層へ戻る導線を並べる表示専用の部品です。`items` を上の階層から順に渡し、
最後の項目が現在地になります（`aria-current="page"`）。`href` を省いた項目はリンクではなく文字列になります。
`nav` のランドマークと `ol` で階層を伝え、区切り記号は CSS で描いて読み上げから外します。狭い幅では項目単位で折り返します。
遷移は持たないため、クライアント側で遷移する場合は親でクリックを受けてルーターへ渡してください。
[使い方とプレビュー](apps/docs/src/content/docs/components/breadcrumb.mdx)を参照してください。
`node scripts/check-breadcrumb.cjs` で生成物と配布 CSS の規則をブラウザーなしに検証します（`pnpm build` のあとに実行）。

## Web ドキュメント

Astro + Starlight のサイトを `apps/docs` に置いています。
導入手順・Accordion・Avatar・Breadcrumb・Button・ButtonGroup・Calendar・Dialog・Drawer・Dropdown・Picker・ProgressBar・Sidebar・Field のページに、Vue／React のデモ・コピーできるコード・API・キーボード操作を掲載します。
コード例は実行するデモのソースから読み込みます。サイト内検索は本番ビルドで有効になります。
複数のコンポーネントを組み合わせた例は「ブロック」にまとめ、`src/content/docs/blocks` に置きます。
現在は「担当者の選択」（Picker で選んだ人を AvatarGroup で表示）があります。

```sh
pnpm dev:docs          # http://localhost:4321
pnpm build:docs    # パッケージとサイトをビルド → apps/docs/dist
pnpm preview:docs  # ビルド済みサイトをローカルで確認
```

ページは `apps/docs/src/content/docs`、デモは `apps/docs/src/examples` で編集します。
デモはパッケージの公開エントリーと CSS を使います。共通コンポーネントを変更したら
`pnpm dev:docs` を起動し直すと、生成・パッケージビルドも反映されます。
`pnpm typecheck` は型定義を含むパッケージをビルドしてから、ドキュメントと Vue／React の例も検査します。

[Docs CI](.github/workflows/docs.yml) は PR・main への push・手動実行でビルドと型検査を行います。
公開先へのデプロイは未設定です。静的ホスティングではリポジトリのルートから
`pnpm build:docs` を実行し、`apps/docs/dist` を出力ディレクトリに指定します。

## VRT CI

[ワークフロー](.github/workflows/vrt.yml) は PR・main への push・手動実行で、
共通ソースから Vue と React を生成してそれぞれ型検査・ビルドし、Storybook を [Koyori VRT](https://vrt.koyori.app) に送信します。
全 Story を撮影し、差分・撮影失敗は各フレームワークのジョブに反映します。
Fork・Dependabot の PR はビルドまで実行し、VRT への送信は省略します。

実行前に GitHub リポジトリの Settings → Secrets and variables → Actions に以下を設定します。

| 種類 | 名前 | 値 |
| --- | --- | --- |
| Secret | `VRT_TOKEN` | 両プロジェクトにアクセスできる PAT。`write:build`・`read:build` スコープが必要 |
| Variable | `VRT_PROJECT_VUE` | Vue 用の `tenant-slug/project-slug`（例: `koyori/ui-vue`） |
| Variable | `VRT_PROJECT_REACT` | React 用の `tenant-slug/project-slug`（例: `koyori/ui-react`） |

VRT 側で 2 つのプロジェクトを作成し、比較基準のブランチを `main` に設定してください。
同じプロジェクトを指定すると比較基準が混ざるため、CI で拒否します。
初回は main のビルドを実行し、VRT 上で結果を確認・承認して比較基準を用意します。
必要な設定が欠けている場合も、送信前に設定エラーとして終了します。

## ライセンス

独自コードは [MIT License](LICENSE) で提供します。著作権者は yupix と sousuke0422 です。
task・vrt から移すコードも、両者が権利を持ち、MIT での提供に合意した部分を対象とします。

第三者由来のコードには、そのコードの元のライセンスが適用されます。
コピーや Vue への移植を行う場合も、元の著作権表示とライセンス文を保持し、
出典・対象ファイル・取り込み元コミットを [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) に記録します。

npm パッケージなどを配布する際は、各配布物に `LICENSE` と、含まれる第三者コードに対応する
著作権表示・ライセンス文を同梱します。フォント・アイコンなどの素材も、それぞれのライセンスに従います。
