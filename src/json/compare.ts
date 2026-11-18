import { diffLines } from 'diff';
import type { JSONPath, Node } from 'jsonc-parser';
import { entries, formatPath, valueLabel } from './document';
import type { JsonDocument } from './document';

export type Difference = { path: string; before?: Node; after?: Node };

// Canonical decimal values let semantically equal number spellings compare
// equally while keeping integers beyond Number.MAX_SAFE_INTEGER distinct.
function decimalKey(raw: string) {
  const [coefficient, exponent = '0'] = raw.toLowerCase().split('e');
  const unsigned = coefficient.replace(/^-/, '');
  const [integer, fraction = ''] = unsigned.split('.');
  const digits = (integer + fraction).replace(/^0+/, '');
  if (!digits) return '0';
  const significant = digits.replace(/0+$/, '');
  const power = BigInt(exponent) + BigInt(digits.length - significant.length - fraction.length);
  return `${coefficient.startsWith('-') ? '-' : ''}${significant}e${power}`;
}

export function compareDocuments(left: JsonDocument, right: JsonDocument) {
  const changes: Difference[] = [];
  const stack: { path: JSONPath; before?: Node; after?: Node }[] = [
    { path: [], before: left.root, after: right.root },
  ];

  while (stack.length) {
    const { path, before, after } = stack.pop()!;
    const record = () => changes.push({ path: formatPath(path), before, after });
    if (!before || !after || before.type !== after.type) {
      record();
      continue;
    }
    if (before.type === 'object' || before.type === 'array') {
      const previous = new Map(entries(before));
      const current = new Map(entries(after));
      const keys = new Set([...previous.keys(), ...current.keys()]);
      for (const key of [...keys].reverse()) {
        stack.push({ path: [...path, key], before: previous.get(key), after: current.get(key) });
      }
      continue;
    }
    if (before.type === 'number') {
      if (decimalKey(valueLabel(left, before)) !== decimalKey(valueLabel(right, after))) record();
    } else if (before.value !== after.value) {
      record();
    }
  }
  return changes;
}

export function compareText(left: string, right: string) {
  return diffLines(left, right, { timeout: 1200 });
}
