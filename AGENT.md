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
