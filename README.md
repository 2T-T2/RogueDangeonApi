# RogueDangeonApi
分割統治法を基にしたアルゴリズムを使用して生成したダンジョンデータを取得するAPI
<br>
サンプル https://rouge-dangeon.deno.dev/rouge_sample?w=70&h=40&n=10

## GET [https://rouge-dangeon.deno.dev/rouge_dangeon](https://rouge-dangeon.deno.dev/rouge_dangeon)
### リクエストパラメータ
| クエリ|  意味  |
| ---- | ---- |
|  w  |  生成されるダンジョン横幅。指定なしだと70マス。  |
|  h  |  生成されるダンジョン縦幅。指定なしだと40マス。  |
|  n  |  生成されるダンジョン部屋数。指定なしだと10部屋。  |
|  s  |  ダンジョン生成時に使用するランダムのシード値。指定なしだと、呼び出された時の時刻のタイムスタンプ。  |

https://rouge-dangeon.deno.dev/rouge_dangeon?w=50&h=30&n=5 横幅50、縦幅30で5部屋のダンジョンを生成。

### リターン
```
{
  "mesh": number[], // ローグダンジョンデータ(文字コード)
  "rooms": Room[], // ダンジョンに含まれる部屋情報
  "coves": Cove[], // ダンジョンに含まれる道情報
  "sections": Section[], //ダンジョンエリア全体が分割されたエリア情報
  "width": number, // ダンジョンの横幅
  "height": number, // ダンジョンの縦幅
}
```

Room
```
{
  "top": number,
  "left": number,
  "width": number,
  "height": number,
  "section": Section, // 自身が属する分割されたエリア
  "door": number[] // ドアの位置。配列長4固定。第１要素には上辺ドアX位置。第２要素には左辺ドアY位置。第３要素には右辺ドアY位置。第４要素には底辺ドアX位置。
}
```

Section
```
{
  "top": number,
  "left": number,
  "width": number,
  "height": number,
  "face": number, // 分割面ビットフラグの値。上辺1,左辺2,右辺4,底辺8 
  "parent": Section // 分割される前の親エリア
}
```

Cove
```
{
  "left": number,
  "top": number,
  "right": number,
  "bottom": number,
  "direction": number // 道の方向。垂直方向1, 水平方向2
}
```

