import { JSONPath } from 'jsonpath-plus';
import type { Node } from 'jsonc-parser';
import { entries, validateJson } from './document';
import type { QueryRequest, QueryResult } from './query';
import { formatText } from './transform';

function nodeAtPointer(root: Node, pointer: string) {
  let node: Node | undefined = root;
  for (const part of pointer.split('/').slice(1)) {
    const key = part.replaceAll('~1', '/').replaceAll('~0', '~');
    if (!node) break;
    node =
      node.type === 'array'
        ? node.children?.[Number(key)]
        : entries(node).findLast(([name]) => name === key)?.[1];
  }
  return node;
}

async function execute({ mode, text, expression }: QueryRequest): Promise<QueryResult> {
  let values: string[];
  if (mode === 'jq') {
    const [{ loadJq }, { default: wasmURL }] = await Promise.all([
      import('jq-wasm'),
      import('jq-wasm/jq.wasm?url'),
    ]);
    const jq = await loadJq({ wasmURL });
    const result = jq.raw(text, expression, ['-c', '-M']);
    if (result.exitCode !== 0 && result.stderr) return { error: result.stderr.trim() };
    values = result.stdout.trim() ? result.stdout.trim().split('\n') : [];
  } else {
    const validation = validateJson(text);
    if (validation.state !== 'valid') return { error: '请先输入有效的 JSON' };
    if (!expression.startsWith('$')) return { error: 'JSONPath 表达式应以 $ 开头' };
    const pointers =
      expression === '$'
        ? ['']
        : JSONPath<string[]>({
            json: JSON.parse(text),
            path: expression,
            resultType: 'pointer',
            eval: 'safe',
          });
    values = (pointers ?? []).flatMap((pointer) => {
      const node = nodeAtPointer(validation.document.root, pointer);
      return node ? [text.slice(node.offset, node.offset + node.length)] : [];
    });
  }
  const output = formatText(`[${values.join(',')}]`);
  return { output, count: values.length };
}

self.onmessage = async ({ data }: MessageEvent<QueryRequest>) => {
  try {
    self.postMessage(await execute(data));
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : '查询失败' });
  }
};
