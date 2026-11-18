import type { Node } from 'jsonc-parser';
import { entries, pathFor, valueLabel } from '../json/document';
import type { JsonDocument } from '../json/document';

export const graphCardLimit = 180;
export const graphCardWidth = 214;
const rowsPerPage = 10;
const columnStep = graphCardWidth + 66;
const cardGap = 22;
const headerHeight = 34;
const rowHeight = 27;
const pageHeight = 30;

export type GraphRow = {
  id: string;
  label: string;
  value: string;
  node: Node;
  branch?: { path: string; expanded: boolean };
};

export type GraphCard = {
  id: string;
  node: Node;
  path: string;
  label: string;
  rows: GraphRow[];
  count?: number;
  page: number;
  pages: number;
  height: number;
  position: { x: number; y: number };
};

type Link = { source: string; sourceHandle: string; target: string };
type Item = {
  card: GraphCard;
  depth: number;
  children: Item[];
  childSpan: number;
  span: number;
};

function itemFor(node: Node, label: string, depth: number): Item {
  return {
    card: {
      id: String(node.offset),
      node,
      path: pathFor(node),
      label,
      rows: [],
      page: 0,
      pages: 1,
      height: 0,
      position: { x: depth * columnStep, y: 0 },
    },
    depth,
    children: [],
    childSpan: 0,
    span: 0,
  };
}

function rowLabel(key: string | number) {
  return typeof key === 'number' ? `[${key}]` : key || '""';
}

function rowValue(document: JsonDocument, node: Node) {
  if (node.type === 'object') return `{${node.children?.length ?? 0}}`;
  if (node.type === 'array') return `[${node.children?.length ?? 0}]`;
  return valueLabel(document, node);
}

export function layoutGraph(
  document: JsonDocument,
  collapsed: ReadonlySet<string>,
  pages: ReadonlyMap<string, number>,
) {
  const items = [itemFor(document.root, '$', 0)];
  const links: Link[] = [];
  const parentByCard = new Map<string, string>();
  const cardByOffset = new Map<number, string>();
  let width = graphCardWidth;
  let truncated = false;

  // Keep each collection together. Only nested containers get another card.
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const { card, depth } = item;
    const { node } = card;
    const isCollection = node.type === 'object' || node.type === 'array';
    cardByOffset.set(node.offset, card.id);
    if (isCollection) card.count = node.children?.length ?? 0;
    card.pages = Math.max(1, Math.ceil((card.count ?? 0) / rowsPerPage));
    card.page = Math.min(pages.get(card.path) ?? 0, card.pages - 1);
    const start = card.page * rowsPerPage;
    const visible: [string | number, Node][] = isCollection
      ? entries(node, start, start + rowsPerPage)
      : [['值', node]];
    for (const [key, child] of visible) {
      const row: GraphRow = {
        id: String(child.offset),
        label: rowLabel(key),
        value: rowValue(document, child),
        node: child,
      };
      card.rows.push(row);
      cardByOffset.set(child.offset, card.id);
      if (!child.children?.length || !isCollection) continue;

      const path = pathFor(child);
      if (collapsed.has(path)) {
        row.branch = { path, expanded: false };
        continue;
      }
      if (items.length === graphCardLimit) {
        truncated = true;
        continue;
      }
      const branch = itemFor(child, row.label, depth + 1);
      row.branch = { path, expanded: true };
      item.children.push(branch);
      items.push(branch);
      links.push({ source: card.id, sourceHandle: row.id, target: branch.card.id });
      parentByCard.set(branch.card.id, card.id);
    }
    card.height =
      2 +
      headerHeight +
      Math.max(1, card.rows.length) * rowHeight +
      (card.pages > 1 ? pageHeight : 0);
    width = Math.max(width, card.position.x + graphCardWidth);
  }

  // Reserve a vertical band for each subtree so cousins never intersect.
  for (let index = items.length - 1; index >= 0; index--) {
    const item = items[index];
    item.childSpan =
      item.children.reduce((height, child) => height + child.span, 0) +
      Math.max(0, item.children.length - 1) * cardGap;
    item.span = Math.max(item.card.height, item.childSpan);
  }
  const height = items[0].span;
  items[0].card.position.y = -height / 2;
  for (const item of items) {
    const bandTop = item.card.position.y;
    item.card.position.y = bandTop + (item.span - item.card.height) / 2;
    let childTop = bandTop + (item.span - item.childSpan) / 2;
    for (const child of item.children) {
      child.card.position.y = childTop;
      childTop += child.span + cardGap;
    }
  }

  return {
    cards: items.map(({ card }) => card),
    links,
    cardByOffset,
    parentByCard,
    width,
    height,
    truncated,
  };
}
