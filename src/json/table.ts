import type { Node } from 'jsonc-parser';
import { entries } from './document';

export function findArrays(root: Node) {
  const arrays: Node[] = [];
  const stack = [root];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.type === 'array') arrays.push(node);
    const children = entries(node);
    for (let index = children.length - 1; index >= 0; index--) {
      stack.push(children[index][1]);
    }
  }
  return arrays;
}

export function buildTable(node: Node) {
  // A separate column for scalar rows avoids collisions with actual property names.
  const columns = new Set<string | null>();
  const rows = entries(node).map(([, item]) => {
    const values =
      item.type === 'object' && item.children?.length
        ? new Map<string | null, Node>(entries(item) as [string, Node][])
        : new Map<string | null, Node>([[null, item]]);
    for (const key of values.keys()) columns.add(key);
    return { node: item, values };
  });
  return { columns: [...columns], rows };
}
