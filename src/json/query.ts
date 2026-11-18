export type QueryMode = 'jsonpath' | 'jq';
export type QueryRequest = { text: string; expression: string; mode: QueryMode };
export type QueryResult = { output: string; count: number } | { error: string };

export function runQuery(request: QueryRequest, signal: AbortSignal): Promise<QueryResult> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const worker = new Worker(new URL('./query.worker.ts', import.meta.url), { type: 'module' });
    const finish = () => {
      clearTimeout(timeout);
      worker.terminate();
      signal.removeEventListener('abort', abort);
    };
    const abort = () => {
      finish();
      reject(signal.reason);
    };
    const timeout = window.setTimeout(() => {
      finish();
      resolve({ error: '查询超时，请缩小数据范围或简化表达式' });
    }, 12_000);

    signal.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data }: MessageEvent<QueryResult>) => {
      finish();
      resolve(data);
    };
    worker.onerror = () => {
      finish();
      resolve({ error: '查询引擎启动失败' });
    };
    worker.postMessage(request);
  });
}
