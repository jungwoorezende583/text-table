# text-table

Render aligned text tables that don't break when cells contain wide characters (CJK, fullwidth, emoji).

## Usage

```js
import { table, measureWidth } from 'text-table';

const out = table([
  ['名前', '年齢'],
  ['Alice', '30'],
  ['太郎', '25'],
]);

console.log(out);
// 名前  年齢
// Alice  30
// 太郎  25

console.log(measureWidth('漢字')); // 4
```

## Why

Most text-table libraries pad cells based on `string.length`, which counts UTF-16 code units. A CJK character or emoji takes two terminal columns but one or two code units, so columns drift out of alignment. This library measures display width by code point and pads accordingly.

The trade-off: the width tables are hand-rolled, not pulled from the full Unicode database. Coverage includes the common CJK, fullwidth, and emoji ranges, plus combining marks treated as zero-width. Obscure scripts may be miscounted. If you need full East Asian Width accuracy for every assigned code point, this is the wrong library.

## Edge cases

- **Ambiguous-width characters** (East Asian Width property `A`) — things like Greek letters or Cyrillic in some terminals — are treated as width 1. If your terminal renders them as width 2, columns will be off by one per such character. This is a deliberate, documented choice rather than a configurable option.
- **Ragged rows** are normalised to the column count of the first row. Shorter rows get empty-string cells; longer rows are truncated. No error is thrown.
- **Trailing whitespace** is trimmed from each line. If you need trailing spaces preserved, post-process the output.

## Exports

- `table(rows: string[][]): string` — render a 2D array as an aligned text table.
- `measureWidth(str: string): number` — measure the display width of a string.
