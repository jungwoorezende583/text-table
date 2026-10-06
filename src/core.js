/**
 * Measure the display width of a string, accounting for wide characters
 * (CJK, fullwidth, emoji) that occupy two columns in a monospace terminal.
 *
 * We use the Unicode East Asian Width property. Characters with property
 * "W" (Wide) or "F" (Fullwidth) take two columns; "A" (Ambiguous) is treated
 * as one column — this is a deliberate choice (see README). Zero-width and
 * nonspacing marks take zero columns. Everything else takes one.
 *
 * Combining marks (General_Category Mn, Me) and control characters are
 * zero-width. This is a hand-rolled table because we cannot depend on
 * third-party Unicode data packages.
 */

// Ranges where East_Asian_Width is W or F (wide / fullwidth).
// Each entry is [start, end] inclusive, code points.
const WIDE_RANGES = [
  [0x1100, 0x115f],   // Hangul Jamo
  [0x2329, 0x232a],   // Left/right pointing angle brackets
  [0x2e80, 0x303e],   // CJK radicals, Kangxi, etc.
  [0x3041, 0x33ff],   // Hiragana, Katakana, CJK symbols
  [0x3400, 0x4dbf],   // CJK Unified Ideographs Extension A
  [0x4e00, 0xa4cf],   // CJK Unified Ideographs
  [0xa960, 0xa97f],   // Hangul Jamo Extended-A
  [0xac00, 0xd7a3],   // Hangul Syllables
  [0xf900, 0xfaff],   // CJK Compatibility Ideographs
  [0xfe10, 0xfe19],   // Vertical forms
  [0xfe30, 0xfe6f],   // CJK Compatibility Forms
  [0xff00, 0xff60],   // Fullwidth Forms
  [0xffe0, 0xffe6],   // Fullwidth signs
  [0x1f300, 0x1f64f], // Emoji (Misc Symbols and Pictographs, Emoticons)
  [0x1f900, 0x1f9ff], // Supplemental Symbols and Pictographs
  [0x20000, 0x2fffd], // CJK Unified Ideographs Extension B-F
  [0x30000, 0x3fffd], // CJK Unified Ideographs Extension G
];

// Ranges of zero-width characters: General_Category Mn, Me, Cf, and control.
// We approximate by listing the common combining-mark and control ranges.
const ZERO_WIDTH_RANGES = [
  [0x0000, 0x001f],   // C0 controls
  [0x007f, 0x009f],   // DEL + C1 controls
  [0x0300, 0x036f],   // Combining Diacritical Marks
  [0x0483, 0x0489],   // Cyrillic combining marks
  [0x0591, 0x05bd],   // Hebrew combining marks (subset)
  [0x05bf, 0x05bf],
  [0x05c1, 0x05c2],
  [0x05c4, 0x05c5],
  [0x05c7, 0x05c7],
  [0x0600, 0x0605],   // Arabic number signs
  [0x0610, 0x061a],   // Arabic combining marks
  [0x064b, 0x065f],
  [0x0670, 0x0670],
  [0x06d6, 0x06dc],
  [0x06df, 0x06e4],
  [0x06e7, 0x06e8],
  [0x06ea, 0x06ed],
  [0x0700, 0x070d],   // Syriac combining marks
  [0x0711, 0x0711],
  [0x0730, 0x074a],
  [0x0900, 0x0903],   // Devanagari combining marks
  [0x093a, 0x093c],
  [0x093e, 0x094f],
  [0x0951, 0x0957],
  [0x200b, 0x200f],   // Zero-width space and directional marks
  [0x2028, 0x202e],   // Line/paragraph separators and directional formatting
  [0x2060, 0x2064],   // Invisible operators
  [0x2066, 0x206f],   // Directional isolate marks
  [0xfe00, 0xfe0f],   // Variation selectors
  [0xfeff, 0xfeff],   // BOM (zero width no-break space)
  [0xfff9, 0xfffb],   // Interlinear annotation
  [0x1b00, 0x1b0a],   // Balinese combining marks
  [0x1dc0, 0x1dff],   // Combining Diacritical Marks Supplement
  [0x20d0, 0x20ff],   // Combining Diacritical Marks for Symbols
  [0xfe20, 0xfe2f],   // Combining Half Marks
  [0xe0100, 0xe01ef], // Variation Selectors Supplement
];

function inRanges(code, ranges) {
  // Binary search over a sorted list of [start, end] inclusive ranges.
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [start, end] = ranges[mid];
    if (code < start) {
      hi = mid - 1;
    } else if (code > end) {
      lo = mid + 1;
    } else {
      return true;
    }
  }
  return false;
}

/**
 * Measure the display width of a string in monospace terminal columns.
 *
 * @param {string} str - The string to measure.
 * @returns {number} Column width.
 */
export function measureWidth(str) {
  if (typeof str !== 'string') {
    throw new TypeError('measureWidth expects a string');
  }
  let width = 0;
  // Iterate by Unicode code point to correctly handle astral characters
  // (emoji, CJK Extension B+). String.prototype[Symbol.iterator] yields
  // code points, not UTF-16 code units, so surrogate pairs are consumed as one.
  for (const ch of str) {
    const code = ch.codePointAt(0);
    if (inRanges(code, ZERO_WIDTH_RANGES)) {
      // zero-width: contributes nothing
      continue;
    }
    if (inRanges(code, WIDE_RANGES)) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * Pad a string on the right to a given display width.
 *
 * We pad based on display width, not string length, so that wide characters
 * don't misalign the column. The number of padding spaces is
 * (targetWidth - measureWidth(str)).
 *
 * @param {string} str
 * @param {number} targetWidth
 * @returns {string}
 */
function padRight(str, targetWidth) {
  const w = measureWidth(str);
  const pad = Math.max(0, targetWidth - w);
  return str + ' '.repeat(pad);
}

/**
 * Render a 2D array of strings as a left-aligned, column-padded text table.
 *
 * Each column's width is the maximum display width of any cell in that
 * column. Rows are joined by a two-space separator. No borders — the
 * output is plain aligned text.
 *
 * @param {string[][]} rows - Array of rows, each row an array of cell strings.
 * @returns {string} The rendered table, lines joined by "\n".
 */
export function table(rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError('table() expects an array of rows');
  }
  if (rows.length === 0) {
    return '';
  }

  // Determine the number of columns from the first row. Rows with fewer
  // cells are padded with empty strings; rows with more cells are
  // truncated to this count. This is a deliberate choice: ragged input
  // is normalised rather than rejected, because real-world data is messy.
  const numCols = rows[0].length;
  const colWidths = new Array(numCols).fill(0);

  const normalised = rows.map((row) => {
    if (!Array.isArray(row)) {
      throw new TypeError('each row must be an array');
    }
    const r = new Array(numCols);
    for (let c = 0; c < numCols; c++) {
      const cell = row[c];
      const s = cell == null ? '' : String(cell);
      r[c] = s;
      const w = measureWidth(s);
      if (w > colWidths[c]) {
        colWidths[c] = w;
      }
    }
    return r;
  });

  const lines = normalised.map((row) =>
    row.map((cell, c) => padRight(cell, colWidths[c])).join('  ')
  );

  // Trim trailing spaces on each line — they serve no alignment purpose
  // after the last column and only create noise in output.
  return lines.map((line) => line.replace(/\s+$/, '')).join('\n');
}
