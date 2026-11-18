import { GitCompareArrows } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Node } from 'jsonc-parser';
import { JsonEditor } from '../editor/JsonEditor';
import { compareDocuments, compareText } from '../json/compare';
import { validateJson } from '../json/document';
import type { JsonDocument } from '../json/document';
import { Button, EmptyState } from '../ui/controls';

type Result =
  | {
      mode: 'structure';
      changes: ReturnType<typeof compareDocuments>;
      left: JsonDocument;
      right: JsonDocument;
    }
  | { mode: 'text'; changes: NonNullable<ReturnType<typeof compareText>> }
  | { mode: 'error'; message: string };

type Props = {
  text: string;
  target: string;
  onTarget: (text: string) => void;
  onSelect: (node: Node) => void;
};

export default function CompareView(props: Props) {
  const { text, target, onTarget, onSelect } = props;
  const [mode, setMode] = useState<'structure' | 'text'>('structure');
  const [snapshot, setSnapshot] = useState<{ text: string; target: string; mode: typeof mode }>();
  const result = useMemo<Result | undefined>(() => {
    if (snapshot?.text !== text || snapshot.target !== target || snapshot.mode !== mode) return;
    if (mode === 'text') {
      const changes = compareText(text, target);
      return changes
        ? { mode, changes }
        : { mode: 'error', message: '文本差异过多，请缩小对比范围' };
    }
    const left = validateJson(text);
    const right = validateJson(target);
    if (left.state !== 'valid' || right.state !== 'valid') {
      return {
        mode: 'error',
        message: `请检查${left.state !== 'valid' ? '源数据' : '对比数据'}的 JSON 语法`,
      };
    }
    return {
      mode,
      changes: compareDocuments(left.document, right.document),
      left: left.document,
      right: right.document,
    };
  }, [snapshot, text, target, mode]);

  return (
    <div className="compare-view">
      <div className="view-toolbar">
        <label className="field-label">
          对比方式
          <select
            aria-label="对比方式"
            value={mode}
            onChange={(event) => setMode(event.target.value === 'text' ? 'text' : 'structure')}
          >
            <option value="structure">结构对比</option>
            <option value="text">文本对比</option>
          </select>
        </label>
        <Button
          variant="primary"
          icon={<GitCompareArrows size={16} />}
          onClick={() => setSnapshot({ text, target, mode })}
        >
          对比
        </Button>
      </div>
      <div className="compare-editor">
        <div className="compare-label">对比数据</div>
        <JsonEditor
          label="JSON 对比数据"
          value={target}
          onChange={onTarget}
          placeholder="在这里粘贴另一份数据…"
        />
      </div>
      {result && (
        <div className="compare-result">
          <CompareResult result={result} onSelect={onSelect} />
        </div>
      )}
    </div>
  );
}

function formatValue(doc: JsonDocument, node?: Node) {
  if (!node) return '—';
  const raw = doc.text.slice(node.offset, node.offset + node.length);
  return raw.length > 420 ? `${raw.slice(0, 419)}…` : raw;
}

function CompareResult({ result, onSelect }: { result: Result; onSelect: (node: Node) => void }) {
  const [limit, setLimit] = useState(150);
  if (result.mode === 'error')
    return (
      <div className="result-error" role="alert">
        {result.message}
      </div>
    );
  if (result.mode === 'text') {
    const changed = result.changes.some(({ added, removed }) => added || removed);
    return changed ? (
      <div className="text-diff" aria-label="文本差异">
        {result.changes.map(({ value, added, removed }, index) => (
          <pre key={index} className={added ? 'diff-added' : removed ? 'diff-removed' : ''}>
            {value}
          </pre>
        ))}
      </div>
    ) : (
      <EmptyState title="文本一致" />
    );
  }

  const { changes, left, right } = result;
  if (!changes.length) return <EmptyState title="JSON 结构一致" />;
  return (
    <>
      <div className="compare-label" role="status">
        {changes.length} 处差异
      </div>
      <table className="data-table diff-table">
        <thead>
          <tr>
            <th scope="col">路径</th>
            <th scope="col">源数据</th>
            <th scope="col">对比数据</th>
          </tr>
        </thead>
        <tbody>
          {changes.slice(0, limit).map(({ path, before, after }) => (
            <tr key={path}>
              <th scope="row">
                {before ? (
                  <button type="button" onClick={() => onSelect(before)}>
                    {path}
                  </button>
                ) : (
                  <code>{path}</code>
                )}
              </th>
              <td className={before ? 'diff-removed' : ''}>
                <code>{formatValue(left, before)}</code>
              </td>
              <td className={after ? 'diff-added' : ''}>
                <code>{formatValue(right, after)}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {limit < changes.length && (
        <Button className="more-button" onClick={() => setLimit(limit + 150)}>
          显示更多
        </Button>
      )}
    </>
  );
}
