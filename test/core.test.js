import { test } from 'node:test';
import assert from 'node:assert/strict';
import { table, measureWidth } from '../src/index.js';

test('measureWidth returns 0 for empty string', () => {
  assert.equal(measureWidth(''), 0);
});

test('measureWidth counts ASCII as 1 each', () => {
  assert.equal(measureWidth('hello'), 5);
});

test('measureWidth counts a CJK character as 2', () => {
  assert.equal(measureWidth('漢'), 2);
});

test('measureWidth counts a fullwidth Latin letter as 2', () => {
  assert.equal(measureWidth('Ａ'), 2);
});

test('measureWidth counts emoji as 2', () => {
  assert.equal(measureWidth('😀'), 2);
});

test('measureWidth treats combining marks as zero-width', () => {
  // 'e' (1) + combining acute accent U+0301 (0) = 1
  assert.equal(measureWidth('e\u0301'), 1);
});

test('measureWidth handles mixed ASCII and CJK', () => {
  assert.equal(measureWidth('ab漢字'), 6);
});

test('measureWidth throws on non-string input', () => {
  assert.throws(() => measureWidth(42), TypeError);
});

test('table returns empty string for empty input', () => {
  assert.equal(table([]), '');
});

test('table aligns plain ASCII columns', () => {
  const out = table([
    ['Name', 'Age'],
    ['Alice', '30'],
    ['Bob', '25'],
  ]);
  assert.equal(
    out,
    'Name   Age\nAlice  30\nBob    25'
  );
});

test('table aligns columns containing wide characters', () => {
  const out = table([
    ['名前', '年齢'],
    ['Alice', '30'],
    ['太郎', '25'],
  ]);
  // '名前' has width 4, 'Alice' has width 5, so column 0 width is 5.
  // '年齢' has width 4, '30'/'25' have width 2, so column 1 width is 4.
  assert.equal(
    out,
    '名前   年齢\nAlice  30\n太郎   25'
  );
});

test('table normalises ragged rows to the first row width', () => {
  const out = table([
    ['a', 'b', 'c'],
    ['1', '2'],
    ['x', 'y', 'z', 'extra'],
  ]);
  assert.equal(
    out,
    'a  b  c\n1  2\nx  y  z'
  );
});

test('table coerces non-string cells to strings', () => {
  const out = table([
    [1, 2],
    [10, 20],
  ]);
  assert.equal(out, '1   2\n10  20');
});

test('table trims trailing whitespace from each line', () => {
  const out = table([
    ['a', 'b'],
    ['aa', 'b'],
  ]);
  // Column 0 width is 2. 'b' column width is 1. Second line's 'b' has no
  // trailing pad because it's the last column.
  assert.equal(out, 'a   b\naa  b');
});

test('table throws on non-array input', () => {
  assert.throws(() => table('not an array'), TypeError);
});

test('table throws when a row is not an array', () => {
  assert.throws(() => table([['ok'], 'bad']), TypeError);
});
