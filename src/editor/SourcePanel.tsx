import { Copy, FileText, Undo2 } from 'lucide-react';
import type { EditorView, ViewUpdate } from '@codemirror/view';
import type { DragEvent } from 'react';
import { Button } from '../ui/controls';
import { JsonEditor } from './JsonEditor';

type Props = {
  text: string;
  filename: string;
  onChange: (text: string) => void;
  onCopy: () => void;
  onUndo: () => void;
  onImport: (file: File) => void;
  onEditor: (view: EditorView) => void;
  onUpdate: (update: ViewUpdate) => void;
};

export function SourcePanel({
  text,
  filename,
  onChange,
  onCopy,
  onUndo,
  onImport,
  onEditor,
  onUpdate,
}: Props) {
  function dropFile(event: DragEvent) {
    const file = event.dataTransfer.files[0];
    if (!file) return;
    event.preventDefault();
    event.stopPropagation();
    onImport(file);
  }

  return (
    <section
      className="panel source-panel"
      aria-label="源数据"
      onDropCapture={dropFile}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) event.preventDefault();
      }}
    >
      <div className="panel-heading source-heading">
        <h1>源数据</h1>
        <span className="filename" title={filename}>
          <FileText size={16} /> <span>{filename}</span>
        </span>
        <Button
          variant="quiet"
          aria-label="复制源数据"
          title="复制源数据"
          icon={<Copy size={18} />}
          onClick={onCopy}
        />
        <Button
          variant="quiet"
          aria-label="撤销"
          title="撤销（Ctrl / ⌘ + Z）"
          icon={<Undo2 size={19} />}
          onClick={onUndo}
        />
      </div>
      <div className="source-body">
        <JsonEditor
          label="JSON 源数据"
          value={text}
          onChange={onChange}
          onCreateEditor={onEditor}
          onUpdate={onUpdate}
        />
      </div>
    </section>
  );
}
