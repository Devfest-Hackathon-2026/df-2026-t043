# 著作物利用シート（素材・ライブラリ・データ出典一覧）

GDGoC Japan Hackathon 2026 提出用の使用ライブラリ・素材一覧です。

## 1. オープンソースライブラリ (npm)

| 名称 | バージョン | ライセンス | 用途 | 出典 URL |
|---|---|---|---|---|
| `@google/genai` | `^1.0.0` | Apache-2.0 | Google Gemini API (`gemini-2.5-flash`) 連携 | https://www.npmjs.com/package/@google/genai |
| `express` | `^4.21.2` | MIT | Web アプリケーション・REST API サーバー | https://www.npmjs.com/package/express |
| `ws` | `^8.18.0` | MIT | WebSocket リアルタイム通信・WebRTC シグナリング | https://www.npmjs.com/package/ws |
| `dotenv` | `^16.4.7` | BSD-2-Clause | 環境変数（`.env`）の読み込み管理 | https://www.npmjs.com/package/dotenv |

## 2. フォント・アイコン・データ素材

| 名称 | ライセンス | 用途 | 備考 |
|---|---|---|---|
| Google Fonts (`Zen Maru Gothic`) | SIL Open Font License 1.1 | 日本語UIフォント表示 | https://fonts.google.com/specimen/Zen+Maru+Gothic |
| 標準 Unicode 絵文字 / 自作 SVG | オリジナル / OS標準 | ドアアイコン・照明表現 | 権利侵害リスクなし |
| 団らん話題カード 100選 (`public/data/topics.json`) | チームオリジナル作成 | 家族団らん用の会話トピックデータ（100件） | 開発期間内に新規作成 |
| パイプライン図 (`public/assets/pipeline.gif`) | チームオリジナル作成 | コンセプト・技術構成のアニメーション図 | `scripts/generate_pipeline_gif.py` で図形から生成。外部画像素材なし |
| Windows 日本語フォント（游ゴシック Bold / メイリオ / MS ゴシック） | Windows 付属フォントの利用条件 | パイプライン図の日本語描画 | インストール済みフォントで文章を画像化。フォントファイルは配布しない。[Microsoft Font FAQ](https://learn.microsoft.com/en-us/typography/fonts/font-faq) |

## 3. 図の生成用ライブラリ (Python)

| 名称 | 使用バージョン | ライセンス | 用途 | 出典 URL |
|---|---|---|---|---|
| Pillow | 11.3.0 | MIT-CMU | パイプライン GIF の描画・書き出し | https://pillow.readthedocs.io/en/stable/about.html |
