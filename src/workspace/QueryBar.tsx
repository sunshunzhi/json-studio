import { Copy, Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { runQuery } from '../json/query';
import type { QueryMode, QueryResult } from '../json/query';
import { Button, Dialog } from '../ui/controls';

export function QueryBar({
  text,
  ready,
  onCopy,
}: {
  text: string;
  ready: boolean;
  onCopy: (text: string, message: string) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<QueryMode>('jsonpath');
  const [expressions, setExpressions] = useState({
    jsonpath: '$.users[*].name',
    jq: '.users[].name',
  });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<QueryResult>();
  const [copyStatus, setCopyStatus] = useState('');
  const request = useRef<AbortController>(null);
  const expression = expressions[mode];

  useEffect(() => () => request.current?.abort(), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready || !expression.trim() || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setCopyStatus('');
    setRunning(true);
    try {
      setResult(await runQuery({ text, expression: expression.trim(), mode }, controller.signal));
    } catch (error) {
      if (!controller.signal.aborted)
        setResult({ error: error instanceof Error ? error.message : '查询失败' });
    } finally {
      request.current = null;
      setRunning(false);
    }
  }

  return (
    <>
      <form className="query-bar" aria-label="JSON 查询" onSubmit={submit}>
        <select
          aria-label="查询语言"
          value={mode}
          disabled={running}
          onChange={(event) => setMode(event.target.value === 'jq' ? 'jq' : 'jsonpath')}
        >
          <option value="jsonpath">JSONPath</option>
          <option value="jq">jq</option>
        </select>
        <input
          aria-label="查询表达式"
          autoComplete="off"
          spellCheck={false}
          disabled={running}
          value={expression}
          placeholder={mode === 'jq' ? '例如 .users[].name' : '例如 $.users[*].name'}
          onChange={(event) => setExpressions({ ...expressions, [mode]: event.target.value })}
        />
        {running ? (
          <Button icon={<Square size={15} />} onClick={() => request.current?.abort()}>
            取消查询
          </Button>
        ) : (
          <Button
            type="submit"
            variant="primary"
            disabled={!ready || !expression.trim()}
            icon={<Play size={16} />}
          >
            运行查询
          </Button>
        )}
      </form>
      {result && (
        <Dialog title="查询结果" onClose={() => setResult(undefined)}>
          {'error' in result ? (
            <pre className="result-error query-error" role="alert">
              {result.error}
            </pre>
          ) : (
            <>
              <div className="query-result-summary">
                <span role="status">{copyStatus || `共 ${result.count} 条结果`}</span>
                <Button
                  icon={<Copy size={16} />}
                  onClick={async () => {
                    const copied = await onCopy(result.output, '已复制查询结果');
                    setCopyStatus(copied ? '已复制查询结果' : '浏览器未授予剪贴板权限');
                  }}
                >
                  复制结果
                </Button>
              </div>
              <pre className="query-output">{result.output}</pre>
            </>
          )}
        </Dialog>
      )}
    </>
  );
}
