import { Copy } from 'lucide-react';
import { lazy, Suspense } from 'react';
import type { Node } from 'jsonc-parser';
import type { JsonDocument } from '../json/document';
import { Button, EmptyState } from '../ui/controls';
import { TableView } from './TableView';
import { TreeView } from './TreeView';

const GraphView = lazy(() => import('./GraphView'));
const CompareView = lazy(() => import('./CompareView'));

const tabs = [
  { id: 'tree', label: '树形' },
  { id: 'table', label: '表格' },
  { id: 'graph', label: '关系图' },
  { id: 'compare', label: '对比' },
] as const;

export type InspectorTab = (typeof tabs)[number]['id'];

type Props = {
  tab: InspectorTab;
  onTab: (tab: InspectorTab) => void;
  text: string;
  document?: JsonDocument;
  selected?: Node;
  selectedPath: string;
  onSelect: (node: Node) => void;
  onCopyPath: () => void;
  arrays: Node[];
  currentArray?: Node;
  onArray: (path: string) => void;
  target: string;
  onTarget: (text: string) => void;
};

export function Inspector(props: Props) {
  const { tab, onTab, selectedPath, onCopyPath } = props;
  return (
    <section className="panel inspector" aria-label="数据视图">
      <div className="panel-heading tabs" role="tablist" aria-label="数据视图">
        {tabs.map(({ id, label }, index) => (
          <button
            key={id}
            type="button"
            id={`tab-${id}`}
            role="tab"
            aria-selected={tab === id}
            aria-controls="inspector-view"
            tabIndex={tab === id ? 0 : -1}
            onClick={() => onTab(id)}
            onKeyDown={(event) => {
              const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
              if (!direction) return;
              event.preventDefault();
              const next = tabs[(index + direction + tabs.length) % tabs.length].id;
              onTab(next);
              window.document.getElementById(`tab-${next}`)?.focus();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id="inspector-view"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="inspector-view"
      >
        <Suspense fallback={<EmptyState title="正在加载视图…" />}>
          <View {...props} />
        </Suspense>
      </div>
      {tab !== 'compare' && (
        <div className="path-bar">
          <code title={selectedPath}>{selectedPath || '—'}</code>
          <Button
            variant="quiet"
            aria-label="复制 JSON 路径"
            title="复制 JSON 路径"
            disabled={!selectedPath}
            onClick={onCopyPath}
            icon={<Copy size={17} />}
          />
        </div>
      )}
    </section>
  );
}

function View({
  tab,
  text,
  document,
  selected,
  onSelect,
  arrays,
  currentArray,
  onArray,
  target,
  onTarget,
}: Props) {
  if (tab === 'compare')
    return <CompareView text={text} target={target} onTarget={onTarget} onSelect={onSelect} />;
  if (!document) {
    return text.trim() ? (
      <EmptyState title="等待有效的 JSON">修正语法后，数据视图会自动更新。</EmptyState>
    ) : (
      <EmptyState title="还没有源数据">粘贴 JSON、拖入文件，或点击「示例」开始。</EmptyState>
    );
  }
  if (tab === 'table')
    return (
      <TableView
        document={document}
        arrays={arrays}
        current={currentArray}
        selected={selected}
        onArray={onArray}
        onSelect={onSelect}
      />
    );
  if (tab === 'graph')
    return <GraphView document={document} selected={selected} onSelect={onSelect} />;
  return <TreeView document={document} selected={selected} onSelect={onSelect} />;
}
