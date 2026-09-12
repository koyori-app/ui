# アクセシビリティ

UI の設計・実装・検証では、デジタル庁の
[ウェブアクセシビリティ導入ガイドブック](https://www.digital.go.jp/resources/introduction-to-web-accessibility-guidebook)
を参考にし、アクセシビリティに配慮する。

コンポーネントの構造・キーボード操作・フォーカス管理は、W3C の
[WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/)
も参考にする。実装する UI に対応するパターン（例：
[Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)、
[Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)）の操作仕様を確認する。

# 角丸

カード内のカードなど、角丸のある要素を入れ子にする場合は、外側の角丸を「内側の角丸 + 外側の padding」にする。
共通トークンを使い、外側の要素の CSS で `calc()` して、角丸・余白の上書きにも追従させる。

# ホバーの動き

メニュー・サイドバー・開閉見出しなど、項目を選ぶ操作のホバーは Dropdown と同じ動きを基本にする。
マウスが入った位置から背景が広がり、項目間では一つの背景が移動する。色・速度・イージングも共通トークンで揃える。
`components/shared/highlight.ts` と `highlight.module.css` を再利用し、現在地・選択状態の色、無効状態、キーボード操作、`prefers-reduced-motion` を保つ。
