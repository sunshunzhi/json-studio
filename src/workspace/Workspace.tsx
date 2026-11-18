import { BookOpen, Braces, Moon, Sun } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { SourcePanel } from '../editor/SourcePanel';
import { Inspector } from '../inspector/Inspector';
import type { InspectorTab } from '../inspector/Inspector';
import { pathFor } from '../json/document';
import type { Validation } from '../json/document';
import { Button } from '../ui/controls';
import { QueryBar } from './QueryBar';
import { Toolbar } from './Toolbar';
import { useWorkspace } from './useWorkspace';
import { ExportDialog, Guide } from './WorkspaceDialogs';

export function Workspace() {
  const workspace = useWorkspace();
  const { source, theme, validation, document, currentArray } = workspace;
  const [tab, setTab] = useState<InspectorTab>('tree');
  const [target, setTarget] = useState('');
  const [dialog, setDialog] = useState<'guide' | 'export'>();
  const fileInput = useRef<HTMLInputElement>(null);
  const formatShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (dialog || window.document.querySelector('dialog[open]')) return;
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyF') {
      event.preventDefault();
      workspace.transform('format');
    }
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => formatShortcut(event);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="workspace" data-theme={theme}>
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">
            <Braces size={25} strokeWidth={2.5} />
          </span>
          <span>JSON Studio</span>
        </div>
        <div className="workspace-label">工作台</div>
        <div className="header-actions">
          <span className="local-label">
            <i />
            本地处理
          </span>
          <Button
            variant="quiet"
            aria-label={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
            onClick={() => workspace.setTheme(theme === 'light' ? 'dark' : 'light')}
            icon={theme === 'light' ? <Sun size={21} /> : <Moon size={19} />}
          />
          <Button
            className="guide-button"
            aria-label="使用指南"
            icon={<BookOpen size={18} />}
            onClick={() => setDialog('guide')}
          >
            <span>使用指南</span>
          </Button>
        </div>
      </header>

      <Toolbar
        onTransform={workspace.transform}
        onExample={() => {
          workspace.loadExample();
          setTab('tree');
        }}
        onClear={workspace.clear}
        onImport={() => fileInput.current?.click()}
        onExport={() =>
          document ? setDialog('export') : workspace.notify('请先输入有效的 JSON', true)
        }
      />
      <input
        ref={fileInput}
        type="file"
        accept=".json,.csv,.txt,application/json,text/csv"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void workspace.openFile(file);
        }}
      />

      <main className="panels" aria-label="JSON 工作台">
        <SourcePanel
          text={source.text}
          filename={source.name}
          onChange={workspace.updateText}
          onCopy={() => {
            void workspace.copy(source.text, '已复制源数据');
          }}
          onUndo={workspace.undoEdit}
          onImport={(file) => {
            void workspace.openFile(file);
          }}
          onEditor={workspace.registerEditor}
          onUpdate={workspace.updateSelection}
        />
        <Inspector
          tab={tab}
          onTab={setTab}
          text={source.text}
          document={document}
          selected={workspace.selected}
          selectedPath={workspace.selectedPath}
          onSelect={workspace.selectNode}
          onCopyPath={() => {
            void workspace.copy(workspace.selectedPath, '已复制 JSON 路径');
          }}
          arrays={workspace.arrays}
          currentArray={currentArray}
          onArray={workspace.setArrayPath}
          target={target}
          onTarget={setTarget}
        />
      </main>

      <QueryBar text={source.text} ready={Boolean(document)} onCopy={workspace.copy} />
      <StatusBar
        text={source.text}
        validation={validation}
        saveStatus={workspace.saveStatus}
        onError={(offset) => workspace.locate(offset, 1)}
      />

      {dialog === 'guide' && <Guide onClose={() => setDialog(undefined)} />}
      {dialog === 'export' && (
        <ExportDialog
          onClose={() => setDialog(undefined)}
          arrayPath={currentArray && pathFor(currentArray)}
          onExport={(format) => {
            if (workspace.exportData(format)) setDialog(undefined);
          }}
        />
      )}
      {workspace.notice && (
        <div className={`toast ${workspace.notice.error ? 'toast-error' : ''}`} role="status">
          {workspace.notice.text}
        </div>
      )}
    </div>
  );
}

function StatusBar({
  text,
  validation,
  saveStatus,
  onError,
}: {
  text: string;
  validation: Validation;
  saveStatus: string;
  onError: (offset: number) => void;
}) {
  return (
    <footer className="status-bar">
      {validation.state === 'invalid' ? (
        <button type="button" className="status-error" onClick={() => onError(validation.offset)}>
          <i />第 {validation.line} 行，第 {validation.column} 列 · {validation.message}
        </button>
      ) : (
        <span className={validation.state === 'valid' ? 'status-valid' : 'muted'} role="status">
          <i />
          {validation.state === 'valid' ? 'JSON 有效' : '等待输入'}
        </span>
      )}
      <span className="status-detail">UTF-8</span>
      <span className="status-detail">{text.split(/\r\n|\r|\n/).length} 行</span>
      <span className="status-detail">2 空格</span>
      <span className="save-status">{saveStatus}</span>
    </footer>
  );
}
