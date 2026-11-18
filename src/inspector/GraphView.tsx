import { Background, Panel, ReactFlow, useReactFlow, useViewport } from '@xyflow/react';
import type { Edge, ReactFlowInstance } from '@xyflow/react';
import { Maximize, Minus, Plus } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Node } from 'jsonc-parser';
import type { JsonDocument } from '../json/document';
import { GraphCard } from './GraphCard';
import type { GraphFlowNode } from './GraphCard';
import { graphCardLimit, graphCardWidth, layoutGraph } from './graph-layout';
import '@xyflow/react/dist/style.css';
import './graph.css';

const nodeTypes = { jsonCard: GraphCard };
const minZoom = 0.05;
const maxZoom = 2;

export default function GraphView({
  document,
  selected,
  onSelect,
}: {
  document: JsonDocument;
  selected?: Node;
  onSelect: (node: Node) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [pages, setPages] = useState<Map<string, number>>(() => new Map());
  const canvas = useRef<HTMLDivElement>(null);
  const graph = useMemo(
    () => layoutGraph(document, collapsed, pages),
    [document, collapsed, pages],
  );
  const selectedCard = selected && graph.cardByOffset.get(selected.offset);

  const toggleBranch = useCallback((path: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  }, []);
  const changePage = useCallback((path: string, page: number) => {
    setPages((previous) => new Map(previous).set(path, page));
  }, []);

  const nodes = useMemo<GraphFlowNode[]>(
    () =>
      graph.cards.map((card) => ({
        id: card.id,
        type: 'jsonCard',
        position: card.position,
        style: { width: graphCardWidth, height: card.height, pointerEvents: 'auto' },
        initialWidth: graphCardWidth,
        initialHeight: card.height,
        data: {
          card,
          hasParent: graph.parentByCard.has(card.id),
          selectedOffset:
            selectedCard === card.id || selected?.offset === card.node.offset
              ? selected?.offset
              : undefined,
          onSelect,
          onToggle: toggleBranch,
          onPage: changePage,
        },
      })),
    [graph, selectedCard, selected?.offset, onSelect, toggleBranch, changePage],
  );

  const edges = useMemo<Edge[]>(() => {
    const active = new Set<string>();
    for (let card = selectedCard; card !== undefined; card = graph.parentByCard.get(card))
      active.add(card);
    return graph.links.map((link) => ({
      ...link,
      id: link.target,
      type: 'default',
      interactionWidth: 0,
      className: active.has(link.target) ? 'graph-edge-active' : undefined,
    }));
  }, [graph, selectedCard]);

  function initializeViewport(instance: ReactFlowInstance<GraphFlowNode>) {
    if (!canvas.current) return;
    const { clientWidth: width, clientHeight: height } = canvas.current;
    const fit = Math.min(1.05, (width - 48) / graph.width, (height - 80) / graph.height);
    // Keep the root and its immediate children readable on narrow screens.
    const secondColumn = graph.cards.find((card) => card.position.x > 0);
    const nearbyWidth = graphCardWidth + (secondColumn?.position.x ?? 0);
    const nearbyZoom = Math.max(0.64, Math.min(0.8, (width - 20) / nearbyWidth));
    const zoom = fit >= 0.65 ? fit : nearbyZoom;
    const x = fit >= 0.65 ? (width - graph.width * zoom) / 2 : 10;
    void instance.setViewport({ x, y: height / 2, zoom });
  }

  return (
    <div className="graph-view" ref={canvas} aria-label="JSON 关系图">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={initializeViewport}
        minZoom={minZoom}
        maxZoom={maxZoom}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={22} size={1.25} color="var(--graph-dot)" />
        {graph.truncated && (
          <Panel position="top-left" className="graph-note">
            画布已达 {graphCardLimit} 张卡片，折叠其他分支可释放空间。
          </Panel>
        )}
        <GraphControls />
      </ReactFlow>
    </div>
  );
}

function GraphControls() {
  const { zoom } = useViewport();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <Panel position="bottom-left" className="graph-controls" aria-label="画布缩放">
      <button
        type="button"
        title="缩小"
        aria-label="缩小"
        disabled={zoom <= minZoom}
        onClick={() => void zoomOut({ duration: 150 })}
      >
        <Minus size={17} />
      </button>
      <span className="graph-scale" aria-label={`缩放比例 ${Math.round(zoom * 100)}%`}>
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        title="放大"
        aria-label="放大"
        disabled={zoom >= maxZoom}
        onClick={() => void zoomIn({ duration: 150 })}
      >
        <Plus size={17} />
      </button>
      <button
        type="button"
        title="适应画布"
        aria-label="适应画布"
        onClick={() => void fitView({ duration: 220, padding: 0.14, maxZoom: 1.05 })}
      >
        <Maximize size={15} />
      </button>
    </Panel>
  );
}
