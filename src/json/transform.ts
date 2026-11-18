import { applyEdits, createScanner, format, SyntaxKind } from 'jsonc-parser';
import type { Node } from 'jsonc-parser';
import { validateJson } from './document';
import type { JsonDocument } from './document';

export type Transform = 'format' | 'minify' | 'sort' | 'escape' | 'unescape';

function minify(text: string) {
  const scanner = createScanner(text, true);
  const tokens: string[] = [];
  for (let kind = scanner.scan(); kind !== SyntaxKind.EOF; kind = scanner.scan()) {
    const start = scanner.getTokenOffset();
    tokens.push(text.slice(start, start + scanner.getTokenLength()));
  }
  return tokens.join('');
}

function sortNode(text: string, node: Node): string {
  if (node.type === 'array') {
    return `[${(node.children ?? []).map((child) => sortNode(text, child)).join(',')}]`;
  }
  if (node.type === 'object') {
    const children = (node.children ?? []).toSorted((a, b) => {
      const [left, right] = [a.children![0].value as string, b.children![0].value as string];
      return left < right ? -1 : Number(left > right);
    });
    const properties = children.map(({ children: [key, value] = [] }) => {
      const rawKey = text.slice(key.offset, key.offset + key.length);
      return `${rawKey}:${sortNode(text, value)}`;
    });
    return `{${properties.join(',')}}`;
  }
  return text.slice(node.offset, node.offset + node.length);
}

export function formatText(text: string) {
  return applyEdits(text, format(text, undefined, { insertSpaces: true, tabSize: 2, eol: '\n' }));
}

export function transformJson(action: Transform, text: string, document?: JsonDocument): string {
  if (action === 'escape') return JSON.stringify(text);
  if (action === 'unescape') {
    if (typeof document?.root.value !== 'string') throw new Error('请输入带双引号的 JSON 字符串');
    return document.root.value;
  }
  if (!document) throw new Error('请先输入有效的 JSON');
  if (action === 'minify') return minify(text);
  return formatText(action === 'sort' ? sortNode(text, document.root) : text);
}

export function formatImportedJson(text: string) {
  return validateJson(text).state === 'valid' ? formatText(text) : text;
}
