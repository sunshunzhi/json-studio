import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import type { Node as FlowNode, NodeProps } from '@xyflow/react';
import { Braces, Brackets, ChevronDown, ChevronLeft, ChevronRight, Code2 } from 'lucide-react';
import { memo, useLayoutEffect } from 'react';
import type { Node } from 'jsonc-parser';
import type { GraphCard as Card } from './graph-layout';

type CardData = {
  card: Card;
  hasParent: boolean;
  selectedOffset?: number;
  onSelect: (node: Node) => void;
  onToggle: (path: string) => void;
  onPage: (path: string, page: number) => void;
};

export type GraphFlowNode = FlowNode<CardData, 'jsonCard'>;

export const GraphCard = memo(function GraphCard({ id, data }: NodeProps<GraphFlowNode>) {
  const { card, hasParent, selectedOffset, onSelect, onToggle, onPage } = data;
  const updateNodeInternals = useUpdateNodeInternals();
  useLayoutEffect(() => {
    updateNodeInternals(id);
  }, [id, card.rows, updateNodeInternals]);

  const isArray = card.node.type === 'array';
  const Icon = isArray ? Brackets : card.node.type === 'object' ? Braces : Code2;
  const title = hasParent
    ? card.label
    : isArray
      ? '根数组'
      : card.node.type === 'object'
        ? '根对象'
        : '根值';

  return (
    <div
      className={`json-graph-card ${isArray ? 'is-array' : ''} ${selectedOffset !== undefined ? 'is-active' : ''}`}
    >
      {hasParent && (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={false}
          className="graph-port graph-port-in"
        />
      )}
      <button
        type="button"
        className="graph-card-header nodrag nopan"
        title={card.path}
        aria-label={`选择 ${card.path}`}
        aria-pressed={selectedOffset === card.node.offset}
        onClick={() => onSelect(card.node)}
      >
        <Icon size={15} className="graph-card-icon" aria-hidden="true" />
        <span className="graph-card-label">{title}</span>
        {card.count !== undefined && (
          <span className="graph-card-count">
            {card.count} {isArray ? '项' : '键'}
          </span>
        )}
      </button>

      {card.rows.map(({ id, node, label, value, branch }) => (
        <div
          className={`graph-card-row ${selectedOffset === node.offset ? 'is-active' : ''}`}
          key={id}
        >
          <button
            type="button"
            className="graph-row-value nodrag nopan"
            title={`${label}  ${value.slice(0, 240)}`}
            aria-pressed={selectedOffset === node.offset}
            onClick={() => onSelect(node)}
          >
            <span className="graph-row-label">{label}</span>
            <span className={`graph-value syntax-${node.type}`}>
              {value.length > 120 ? `${value.slice(0, 119)}…` : value}
            </span>
          </button>
          {branch && (
            <button
              type="button"
              className="graph-branch-toggle nodrag nopan"
              title={`${branch.expanded ? '折叠' : '展开'} ${branch.path}`}
              aria-label={`${branch.expanded ? '折叠' : '展开'} ${branch.path}`}
              aria-expanded={branch.expanded}
              onClick={() => onToggle(branch.path)}
            >
              {branch.expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          )}
          {branch?.expanded && (
            <Handle
              id={id}
              type="source"
              position={Position.Right}
              isConnectable={false}
              className="graph-port graph-port-out"
            />
          )}
        </div>
      ))}
      {card.rows.length === 0 && (
        <div className="graph-card-empty">{isArray ? '空数组' : '空对象'}</div>
      )}

      {card.pages > 1 && (
        <div className="graph-card-pagination" aria-label={`${card.path} 分页`}>
          <button
            type="button"
            className="nodrag nopan"
            aria-label={`${card.path} 上一页`}
            disabled={card.page === 0}
            onClick={() => onPage(card.path, card.page - 1)}
          >
            <ChevronLeft size={14} />
          </button>
          <span aria-live="polite">
            {card.page + 1} / {card.pages}
          </span>
          <button
            type="button"
            className="nodrag nopan"
            aria-label={`${card.path} 下一页`}
            disabled={card.page === card.pages - 1}
            onClick={() => onPage(card.path, card.page + 1)}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
});
