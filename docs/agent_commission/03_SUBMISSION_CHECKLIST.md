# 03. 提出要件・検証・運用チェックリスト

## 1. 提出物一覧と対応ファイル

| 提出物 | ステータス | パス / URL |
|---|---|---|
| **GitHub リポジトリ** | ✅ 完了 | https://github.com/yoikoarmor/GDG-hackathon |
| **Cloud Run デプロイURL** | ✅ 稼働中 | https://gdg-hackathon-752978143113.asia-northeast1.run.app/ |
| **プロダクト説明ドキュメント（最終PDF・全7ページ）** | ✅ テンプレート準拠・表示確認済 | [docs/PRODUCT_DOCUMENT.pdf](../PRODUCT_DOCUMENT.pdf) |
| **プロダクト説明ドキュメント (Markdown)** | ✅ 最新化済 | [docs/PRODUCT_DOCUMENT.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/docs/PRODUCT_DOCUMENT.md) |
| **プロダクト説明ドキュメント (A4印刷・PDF出力用HTML)** | ✅ 最新化済 | [docs/PRODUCT_DOCUMENT.html](file:///c:/Users/yoiko/Downloads/GDG-hackathon/docs/PRODUCT_DOCUMENT.html) |
| **アーキテクチャ図 GIF** | ✅ 最新化済 | [public/assets/pipeline.gif](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/assets/pipeline.gif) |
| **OSS・素材ライセンス一覧（著作物利用シート用）** | ✅ 完了 | [LICENSE_CREDITS.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/LICENSE_CREDITS.md) |

---

## 2. よく使うコマンド一覧

```powershell
# 最新コードの取得
git pull --ff-only origin main

# 自動監査・単体＆結合テスト実行（全17項目）
npm test

# アーキテクチャGIFの再生成
python scripts/generate_pipeline_gif.py

# ローカルサーバー起動 (http://localhost:8080)
npm start
```
