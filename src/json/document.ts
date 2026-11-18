import { getNodePath, parseTree, ParseErrorCode, printParseErrorCode } from 'jsonc-parser';
import type { JSONPath, Node, ParseError } from 'jsonc-parser';

export type JsonDocument = { text: string; root: Node };

export type Validation =
  | { state: 'empty' }
  | { state: 'valid'; document: JsonDocument }
  | { state: 'invalid'; offset: number; line: number; column: number; message: string };

const messages: Partial<Record<ParseErrorCode, string>> = {
  [ParseErrorCode.InvalidSymbol]: '包含无效字符',
  [ParseErrorCode.InvalidNumberFormat]: '数字格式无效',
  [ParseErrorCode.PropertyNameExpected]: '此处需要用双引号括起的属性名',
  [ParseErrorCode.ValueExpected]: '此处需要一个值',
  [ParseErrorCode.ColonExpected]: '属性名后缺少冒号',
  [ParseErrorCode.CommaExpected]: '值之间缺少逗号',
  [ParseErrorCode.CloseBraceExpected]: '对象缺少右花括号',
  [ParseErrorCode.CloseBracketExpected]: '数组缺少右方括号',
  [ParseErrorCode.EndOfFileExpected]: 'JSON 值结束后仍有内容',
  [ParseErrorCode.InvalidCommentToken]: 'JSON 中不能包含注释',
  [ParseErrorCode.UnexpectedEndOfString]: '字符串缺少结束引号',
  [ParseErrorCode.InvalidEscapeCharacter]: '字符串中存在无效的转义',
  [ParseErrorCode.InvalidUnicode]: '字符串中存在无效的 Unicode 转义',
};

export function validateJson(text: string): Validation {
  if (!text.trim()) return { state: 'empty' };

  const errors: ParseError[] = [];
  let root: Node | undefined;
  try {
    root = parseTree(text, errors, { disallowComments: true });
    // The syntax tree gives source ranges. JSON.parse also checks strict JSON grammar.
    if (root && errors.length === 0) {
      JSON.parse(text);
      return { state: 'valid', document: { root, text } };
    }
  } catch (error) {
    if (error instanceof RangeError) {
      return { state: 'invalid', offset: 0, line: 1, column: 1, message: 'JSON 嵌套层级过深' };
    }
    if (!errors.length) {
      const position = /position (\d+)/.exec(String(error));
      return errorAt(text, Number(position?.[1] ?? 0), 'JSON 语法无效');
    }
  }

  const issue = errors[0];
  return errorAt(
    text,
    issue?.offset ?? 0,
    issue ? (messages[issue.error] ?? printParseErrorCode(issue.error)) : 'JSON 语法无效',
  );
}

function errorAt(text: string, offset: number, message: string): Validation {
  const lines = text.slice(0, offset).split(/\r\n|\r|\n/);
  return {
    state: 'invalid',
    offset,
    line: lines.length,
    column: lines.at(-1)!.length + 1,
    message,
  };
}

export function entries(node: Node, start = 0, end?: number): [string | number, Node][] {
  const children = node.children ?? [];
  const visible = start || end !== undefined ? children.slice(start, end) : children;
  if (node.type === 'array') return visible.map((child, index) => [start + index, child]);
  if (node.type === 'object') {
    return visible.map(({ children }) => [children![0].value as string, children![1]]);
  }
  return [];
}

export function valueLabel(document: JsonDocument, node: Node) {
  if (node.type === 'array') return `[ ${node.children?.length ?? 0} ]`;
  if (node.type === 'object') return node.children?.length ? '{ … }' : '{ }';
  return document.text.slice(node.offset, node.offset + node.length);
}

export function formatPath(path: JSONPath) {
  return path.reduce<string>((result, key) => {
    if (typeof key === 'number') return `${result}[${key}]`;
    return /^[A-Za-z_$][\w$]*$/.test(key)
      ? `${result}.${key}`
      : `${result}[${JSON.stringify(key)}]`;
  }, '$');
}

export function pathFor(node: Node) {
  return formatPath(getNodePath(node));
}
