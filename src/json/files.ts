import Papa from 'papaparse';
import { valueLabel } from './document';
import type { JsonDocument } from './document';
import { buildTable } from './table';
import { formatImportedJson } from './transform';

export type ExportFormat = 'json' | 'csv';

export function csvToJson(text: string) {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const error = result.errors.find((item) => item.code !== 'UndetectableDelimiter');
  if (error)
    throw new Error(
      `CSV 解析失败${error.row === undefined ? '' : `（数据行 ${error.row + 1}）`}：${error.message}`,
    );
  const [headers = [], ...records] = result.data;
  if (new Set(headers).size !== headers.length) throw new Error('CSV 包含重复的列名');
  const rows = records.map((record, index) => {
    if (record.length !== headers.length)
      throw new Error(`CSV 第 ${index + 1} 个数据行的列数与表头不同`);
    return Object.fromEntries(headers.map((name, column) => [name, record[column]]));
  });
  return JSON.stringify(rows, null, 2);
}

export async function importFile(file: File) {
  const text = (await file.text()).replace(/^\uFEFF/, '');
  const isCsv = /\.csv$/i.test(file.name) || file.type === 'text/csv';
  return {
    text: isCsv ? csvToJson(text) : formatImportedJson(text.replace(/\r\n?/g, '\n')),
    name: isCsv ? `${file.name.replace(/\.csv$/i, '')}.json` : file.name,
  };
}

export function jsonToCsv(document: JsonDocument, array = document.root) {
  if (array.type !== 'array') throw new Error('请在表格视图选择要导出的数组');
  const { columns, rows } = buildTable(array);
  if (!rows.length) return '';
  const fieldNames = new Set(columns);
  let scalarField = '值';
  while (fieldNames.has(scalarField)) scalarField += '_';
  return Papa.unparse({
    fields: columns.map((key) => key ?? scalarField),
    data: rows.map(({ values }) =>
      columns.map((key) => {
        const node = values.get(key);
        if (!node) return '';
        if (node.type === 'string') return node.value as string;
        if (node.type === 'null') return '';
        if (node.type === 'array' || node.type === 'object') {
          return document.text.slice(node.offset, node.offset + node.length);
        }
        return valueLabel(document, node);
      }),
    ),
  });
}

export function downloadFile(text: string, name: string, format: ExportFormat) {
  const type = format === 'json' ? 'application/json' : 'text/csv';
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
