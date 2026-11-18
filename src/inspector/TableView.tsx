import { useMemo, useState } from 'react';
import type { Node } from 'jsonc-parser';
import { pathFor, valueLabel } from '../json/document';
import type { JsonDocument } from '../json/document';
import { buildTable } from '../json/table';
import { Button, EmptyState } from '../ui/controls';

type Props = {
  document: JsonDocument;
  arrays: Node[];
  current?: Node;
  selected?: Node;
  onArray: (path: string) => void;
  onSelect: (node: Node) => void;
};

const pageSize = 100;

export function TableView({ document, arrays, current, selected, onArray, onSelect }: Props) {
  if (!current)
    return <EmptyState title="没有可显示的数组">表格可以浏览 JSON 数组中的数据。</EmptyState>;
  return (
    <>
      <div className="view-toolbar">
        <label className="field-label">
          数组路径
          <select
            aria-label="数组路径"
            value={pathFor(current)}
            onChange={(event) => onArray(event.target.value)}
          >
            {arrays.map((array) => (
              <option key={array.offset} value={pathFor(array)}>
                {pathFor(array)}
              </option>
            ))}
          </select>
        </label>
        <span className="muted">{current.children?.length ?? 0} 项</span>
      </div>
      <TableData
        key={pathFor(current)}
        document={document}
        array={current}
        selected={selected}
        onSelect={onSelect}
      />
    </>
  );
}

function TableData({
  document,
  array,
  selected,
  onSelect,
}: {
  document: JsonDocument;
  array: Node;
  selected?: Node;
  onSelect: (node: Node) => void;
}) {
  const [page, setPage] = useState(0);
  const { columns, rows } = useMemo(() => buildTable(array), [array]);
  if (!rows.length) return <EmptyState title="这是一个空数组" />;
  const last = Math.ceil(rows.length / pageSize) - 1;
  const current = Math.min(page, last);
  const start = current * pageSize;

  return (
    <>
      <div className="view-scroll table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">索引</th>
              {columns.map((key) => (
                <th scope="col" key={JSON.stringify(key)}>
                  {key === null ? '值' : key || '""'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(start, start + pageSize).map(({ node, values }, index) => (
              <tr key={node.offset}>
                <th scope="row">
                  <button type="button" onClick={() => onSelect(node)}>
                    {start + index}
                  </button>
                </th>
                {columns.map((key) => {
                  const value = values.get(key);
                  return (
                    <td key={JSON.stringify(key)}>
                      {value ? (
                        <button
                          type="button"
                          className={`syntax-${value.type} ${selected === value ? 'selected' : ''}`}
                          title={valueLabel(document, value)}
                          onClick={() => onSelect(value)}
                        >
                          {valueLabel(document, value)}
                        </button>
                      ) : (
                        <span className="missing-value">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {last > 0 && (
        <div className="table-footer">
          <Button onClick={() => setPage(current - 1)} disabled={current === 0}>
            上一页
          </Button>
          <span>
            第 {current + 1} / {last + 1} 页
          </span>
          <Button onClick={() => setPage(current + 1)} disabled={current === last}>
            下一页
          </Button>
        </div>
      )}
    </>
  );
}
