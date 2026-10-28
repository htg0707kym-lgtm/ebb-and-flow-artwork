# ファイルと素材の案内

GitHubに慣れていない方は、まず[鑑賞ページ](https://htg0707kym-lgtm.github.io/ebb-and-flow-artwork/)を開いてください。
ダウンロードやプログラムの準備は不要です。

## そのまま使う・見る

| 欲しいもの | 開く場所 |
| --- | --- |
| 映像を見る／操作する | [鑑賞ページ](https://htg0707kym-lgtm.github.io/ebb-and-flow-artwork/) |
| 投稿用動画・サムネ・投稿文 | [投稿素材ページ](https://htg0707kym-lgtm.github.io/ebb-and-flow-artwork/share.html) |
| 全編動画・軽量720p（約43MB） | [MP4を開く](https://htg0707kym-lgtm.github.io/ebb-and-flow-artwork/watch-mobile.mp4) |
| 全編動画・1080p（約125MB） | [MP4を開く](https://htg0707kym-lgtm.github.io/ebb-and-flow-artwork/full-partitions-20261028-current.mp4) |
| 完成ミックスの鑑賞用音声・AAC（約7MB） | [音声を開く](https://htg0707kym-lgtm.github.io/ebb-and-flow-artwork/audio/watch-mix.m4a) |
| 描画に使う画像・設定・フォント一式 | 下の「配信データ」 |
| 鑑賞ページの元コード | [viewerフォルダ](viewer/) |

元のWAV、個別ステム、ボーカル単体はこの公開リポジトリに含めていません。
完成ミックスや完成映像には通常の楽曲としてボーカルが含まれます。

## 配信データ（開発者向け）

大きいデータは、Code欄ではなく [Releases（配布ファイル）](https://github.com/htg0707kym-lgtm/ebb-and-flow-artwork/releases) にあります。
各ページの **Assets** を開くとダウンロードできます。名前が似ていますが、それぞれ役割が違います。

1. [ベースデータ](https://github.com/htg0707kym-lgtm/ebb-and-flow-artwork/releases/tag/artwork-2026-10-28-mobile)：画像・完成動画・完成ミックス・描画用設定・フォント。
2. [操作部の更新](https://github.com/htg0707kym-lgtm/ebb-and-flow-artwork/releases/tag/artwork-2026-10-28-motion)：リアルタイム操作の更新。
3. [投稿素材の追加](https://github.com/htg0707kym-lgtm/ebb-and-flow-artwork/releases/tag/artwork-2026-10-28-share)：投稿素材ページ、短い動画、サムネ、現在の鑑賞コード。

ベースはサイズのため `part1` と `part2` に分かれています。両方を同じフォルダへ保存し、
Windowsのコマンドプロンプトで次を実行するとZIPへ戻せます。

```bat
copy /b artwork-site-mobile-20261028.zip.part1+artwork-site-mobile-20261028.zip.part2 artwork.zip
```

`artwork.zip`を展開し、操作部・投稿素材のZIPを順に同じ場所へ上書き展開します。
これは配信スナップショットです。元の制作プロジェクトや個別ステムのバックアップではありません。

## 公開しないもの

- ボーカル単体音源、個別ステム、元WAV
- 制作PCのフォルダ、秘密情報、生成API、制作アプリの保存状態

閲覧者の操作はそれぞれのブラウザ内だけに作用します。制作PCへは接続しません。
公開した映像・音声・画像は保存可能です。閲覧可能であることと、自由な再利用許諾は別です。
