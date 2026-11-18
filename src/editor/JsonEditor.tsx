import { indentWithTab } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { EditorView, keymap } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import CodeMirror from '@uiw/react-codemirror';
import type { ReactCodeMirrorProps } from '@uiw/react-codemirror';
import { useMemo } from 'react';

const syntax = HighlightStyle.define([
  { tag: tags.propertyName, class: 'syntax-property' },
  { tag: tags.string, class: 'syntax-string' },
  { tag: tags.number, class: 'syntax-number' },
  { tag: tags.bool, class: 'syntax-boolean' },
  { tag: tags.null, class: 'syntax-null' },
]);

const extensions = [
  json(),
  indentUnit.of('  '),
  syntaxHighlighting(syntax),
  keymap.of([indentWithTab]),
];

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '15px',
    backgroundColor: 'var(--surface)',
    color: 'var(--ink)',
  },
  '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.42' },
  '.cm-content': { padding: '8px 0 18px', caretColor: 'var(--ink)' },
  '.cm-line': { padding: '0 12px' },
  '.cm-gutters': {
    color: 'var(--muted)',
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border)',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 9px 0 11px' },
  '.cm-foldGutter': { width: '17px' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--surface-hover)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--selected)',
  },
  '&.cm-focused': { outline: 'none' },
});

const basicSetup: ReactCodeMirrorProps['basicSetup'] = {
  highlightActiveLine: false,
  highlightActiveLineGutter: false,
  foldGutter: true,
  highlightSelectionMatches: false,
  autocompletion: false,
};

export function JsonEditor({ label, ...props }: ReactCodeMirrorProps & { label: string }) {
  const labeledExtensions = useMemo(
    () => [...extensions, EditorView.contentAttributes.of({ 'aria-label': label })],
    [label],
  );
  return (
    <CodeMirror
      {...props}
      className="json-editor"
      height="100%"
      theme={editorTheme}
      basicSetup={basicSetup}
      extensions={labeledExtensions}
    />
  );
}
