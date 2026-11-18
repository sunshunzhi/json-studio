import { ChevronDown, ChevronRight, MinusSquare, PlusSquare, Search } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Node } from 'jsonc-parser';
import { entries, valueLabel } from '../json/document';
import type { JsonDocument } from '../json/document';
import { Button, EmptyState } from '../ui/controls';

type TreeItem = {
  node: Node;
  key: string | number;
  depth: number;
  children: TreeItem[];
};
type Expansion = 'default' | 'all' | 'none';
const pageSize = 250;

function buildTree(node: Node, key: string | number, depth: number): TreeItem {
  return {
    node,
    key,
    depth,
    children: entries(node).map(([key, child]) => buildTree(child, key, depth + 1)),
  };
}

function searchTree(root: TreeItem, document: JsonDocument, term: string) {
  const matches = new Set<number>();
  function visit(item: TreeItem): boolean {
    let found = String(item.key).toLowerCase().includes(term);
    if (!item.children.length)
      found ||= valueLabel(document, item.node).toLowerCase().includes(term);
    for (const child of item.children) if (visit(child)) found = true;
    if (found) matches.add(item.node.offset);
    return found;
  }
  visit(root);
  return matches;
}

function isExpanded(item: TreeItem, mode: Expansion, toggled: Set<Node>) {
  const defaultOpen = item.depth < 2 || (item.depth === 2 && item.key === 0);
  const open = mode === 'all' || (mode === 'default' && defaultOpen);
  return toggled.has(item.node) ? !open : open;
}

type Props = { document: JsonDocument; selected?: Node; onSelect: (node: Node) => void };

export function TreeView({ document, selected, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const term = useDeferredValue(search.trim().toLowerCase());
  const [expansion, setExpansion] = useState<Expansion>('default');
  const [toggled, setToggled] = useState<Set<Node>>(() => new Set());
  const [limit, setLimit] = useState(pageSize);
  const root = useMemo(() => buildTree(document.root, '根对象', 0), [document.root]);
  const matches = useMemo(
    () => (term ? searchTree(root, document, term) : null),
    [root, document, term],
  );
  const visible: TreeItem[] = [];
  const stack = [root];
  while (stack.length && visible.length <= limit) {
    const item = stack.pop()!;
    if (matches && !matches.has(item.node.offset)) continue;
    visible.push(item);
    if (!matches && !isExpanded(item, expansion, toggled)) continue;
    for (let index = item.children.length - 1; index >= 0; index--)
      stack.push(item.children[index]);
  }

  function expand(mode: Expansion) {
    setToggled(new Set());
    setExpansion(mode);
  }

  return (
    <>
      <div className="view-toolbar tree-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            type="search"
            placeholder="搜索键或值…"
            aria-label="搜索键或值"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setLimit(pageSize);
            }}
          />
        </label>
        <Button
          icon={<PlusSquare size={16} />}
          onClick={() => expand('all')}
          disabled={Boolean(term)}
        >
          展开全部
        </Button>
        <Button
          icon={<MinusSquare size={16} />}
          onClick={() => expand('none')}
          disabled={Boolean(term)}
        >
          折叠全部
        </Button>
      </div>
      <div className="view-scroll tree-scroll" aria-label="JSON 树形结构">
        {!visible.length && <EmptyState title="未找到匹配项">试试其他属性名或值。</EmptyState>}
        {visible.slice(0, limit).map((item) => {
          const { node, key, depth, children } = item;
          const open = Boolean(matches) || isExpanded(item, expansion, toggled);
          const label = depth
            ? typeof key === 'number'
              ? `[${key}]`
              : key || '""'
            : node.type === 'object'
              ? '根对象'
              : '根节点';
          return (
            <div
              className="tree-row"
              key={node.offset}
              style={{ '--depth': depth } as CSSProperties}
            >
              {children.length > 0 ? (
                <button
                  className="tree-toggle"
                  type="button"
                  aria-expanded={open}
                  aria-label={`${open ? '折叠' : '展开'} ${label}`}
                  disabled={Boolean(matches)}
                  onClick={() =>
                    setToggled((previous) => {
                      const next = new Set(previous);
                      if (!next.delete(node)) next.add(node);
                      return next;
                    })
                  }
                >
                  {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <span className="tree-toggle" />
              )}
              <button
                type="button"
                className={`tree-value ${selected === node ? 'selected' : ''}`}
                onClick={() => onSelect(node)}
              >
                {depth === 0 && (
                  <span className="tree-root-mark">{node.type === 'array' ? '[ ]' : '{ }'}</span>
                )}
                <strong>{label}</strong>
                {(node.type !== 'object' || depth > 0) && (
                  <span className={`syntax-${node.type}`}>: {valueLabel(document, node)}</span>
                )}
                <span className="type-tag">{node.type}</span>
              </button>
            </div>
          );
        })}
        {visible.length > limit && (
          <Button className="more-button" onClick={() => setLimit(limit + pageSize)}>
            显示更多
          </Button>
        )}
      </div>
    </>
  );
}
