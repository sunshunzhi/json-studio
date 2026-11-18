import { undo } from '@codemirror/commands';
import { EditorView } from '@codemirror/view';
import { findNodeAtLocation, getLocation, getNodePath } from 'jsonc-parser';
import type { JSONPath, Node } from 'jsonc-parser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ViewUpdate } from '@codemirror/view';
import { formatPath, pathFor, validateJson } from '../json/document';
import { downloadFile, importFile, jsonToCsv } from '../json/files';
import type { ExportFormat } from '../json/files';
import { findArrays } from '../json/table';
import { transformJson } from '../json/transform';
import type { Transform } from '../json/transform';
import { exampleName, exampleText } from './example';
import { readSource, readTheme, useStorePreferences } from './storage';
import type { Source } from './storage';

type Notice = { text: string; error: boolean };
const exampleSelection = ['users', 0, 'name'];
const noArrays: Node[] = [];

export function useWorkspace() {
  const [source, setSource] = useState(readSource);
  const [theme, setTheme] = useState(readTheme);
  const [nodePath, setNodePath] = useState<JSONPath>(() =>
    source.text === exampleText ? exampleSelection : [],
  );
  const [arrayPath, setArrayPath] = useState('');
  const [notice, setNotice] = useState<Notice>();
  const editor = useRef<EditorView>(null);
  const importVersion = useRef(0);
  const validation = useMemo(() => validateJson(source.text), [source.text]);
  const document = validation.state === 'valid' ? validation.document : undefined;
  const selected = document && (findNodeAtLocation(document.root, nodePath) ?? document.root);
  const selectedPath = selected ? pathFor(selected) : '';
  const arrays = useMemo(() => (document ? findArrays(document.root) : noArrays), [document]);
  const currentArray = arrays.find((array) => pathFor(array) === arrayPath) ?? arrays[0];
  const saveStatus = useStorePreferences(source, theme);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(undefined), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function notify(text: string, error = false) {
    setNotice({ text, error });
  }

  function notifyError(error: unknown) {
    notify(error instanceof Error ? error.message : String(error), true);
  }

  function updateText(text: string) {
    importVersion.current++;
    const normalized = text.replace(/\r\n?/g, '\n');
    setSource((previous) =>
      previous.text === normalized ? previous : { ...previous, text: normalized },
    );
  }

  function replaceSource(next: Source, path: JSONPath = []) {
    importVersion.current++;
    setSource(next);
    setNodePath(path);
    setArrayPath('');
  }

  async function openFile(file: File) {
    const version = ++importVersion.current;
    try {
      const next = await importFile(file);
      if (version !== importVersion.current) return;
      replaceSource(next);
      notify(`已导入 ${file.name}`);
    } catch (error) {
      if (version === importVersion.current) notifyError(error);
    }
  }

  function exportData(format: ExportFormat) {
    if (format === 'json' && !document) return false;
    try {
      if (!document) throw new Error('请先输入有效的 JSON');
      const text = format === 'csv' ? jsonToCsv(document, currentArray) : source.text;
      const name = `${source.name.replace(/\.[^.]+$/, '') || 'data'}.${format}`;
      downloadFile(text, name, format);
      return true;
    } catch (error) {
      notifyError(error);
      return false;
    }
  }

  function transform(action: Transform) {
    try {
      const text = transformJson(action, source.text, document);
      updateText(text);
      if (text === source.text) notify('内容无需修改');
    } catch (error) {
      notifyError(error);
    }
  }

  function locate(offset: number, length = 0) {
    const view = editor.current;
    if (!view) return;
    const anchor = Math.min(offset, view.state.doc.length);
    const head = Math.min(anchor + length, view.state.doc.length);
    view.dispatch({
      selection: { anchor, head },
      effects: EditorView.scrollIntoView(anchor, { y: 'center' }),
    });
  }

  function selectNode(node: Node) {
    setNodePath(getNodePath(node));
    const length = node.type === 'object' || node.type === 'array' ? 1 : node.length;
    locate(node.offset, length);
  }

  function undoEdit() {
    if (editor.current && undo(editor.current)) editor.current.focus();
    else notify('没有可撤销的编辑');
  }

  const registerEditor = useCallback((view: EditorView) => {
    editor.current = view;
  }, []);

  function updateSelection(update: ViewUpdate) {
    if (!update.selectionSet || update.docChanged || !update.view.hasFocus) return;
    const offset = update.state.selection.main.anchor;
    const { path } = getLocation(update.state.doc.toString(), offset);
    setNodePath((previous) => (formatPath(previous) === formatPath(path) ? previous : path));
  }

  async function copy(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify(message);
      return true;
    } catch {
      notify('浏览器未授予剪贴板权限', true);
      return false;
    }
  }

  return {
    source,
    theme,
    setTheme,
    document,
    validation,
    selected,
    selectedPath,
    arrays,
    currentArray,
    setArrayPath,
    notice,
    saveStatus,
    notify,
    copy,
    openFile,
    exportData,
    transform,
    updateText,
    selectNode,
    locate,
    undoEdit,
    registerEditor,
    updateSelection,
    loadExample: () => replaceSource({ text: exampleText, name: exampleName }, exampleSelection),
    clear: () => replaceSource({ text: '', name: 'untitled.json' }),
  };
}
