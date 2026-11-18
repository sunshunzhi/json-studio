import { Braces, FileSpreadsheet } from 'lucide-react';
import type { ExportFormat } from '../json/files';
import { Button, Dialog } from '../ui/controls';

export function Guide({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="使用指南" onClose={onClose}>
      <dl className="guide-list">
        <dt>编辑</dt>
        <dd>粘贴 JSON 或拖入 JSON、CSV 文件。点击底部错误提示可跳到对应位置。</dd>
        <dt>浏览</dt>
        <dd>
          点击树形、表格或关系图中的内容可跳到源码，并在底部复制路径。关系图按索引列出数组，用行末箭头展开或折叠嵌套内容。
        </dd>
        <dt>查询</dt>
        <dd>
          在底部选择 JSONPath 或 jq，输入表达式后运行。例如 <code>$.users[*].name</code> 或{' '}
          <code>.users[].name</code>。
        </dd>
        <dt>对比</dt>
        <dd>
          切换到「对比」，粘贴另一份数据。结构对比按键和数组索引查看变化，文本对比按行显示变化。
        </dd>
        <dt>导出</dt>
        <dd>可下载 JSON。导出 CSV 时使用表格中选中的数组，CSV 导入时字段按字符串读取。</dd>
        <dt>快捷键</dt>
        <dd>
          <kbd>Ctrl / ⌘</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> 格式化，<kbd>Ctrl / ⌘</kbd> +{' '}
          <kbd>Z</kbd> 撤销。
        </dd>
      </dl>
    </Dialog>
  );
}

export function ExportDialog({
  onClose,
  onExport,
  arrayPath,
}: {
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
  arrayPath?: string;
}) {
  return (
    <Dialog title="导出数据" onClose={onClose}>
      <div className="export-options">
        <Button icon={<Braces size={18} />} onClick={() => onExport('json')}>
          下载 JSON
        </Button>
        <Button
          icon={<FileSpreadsheet size={18} />}
          disabled={!arrayPath}
          onClick={() => onExport('csv')}
        >
          下载 CSV
        </Button>
      </div>
      {arrayPath ? (
        <p className="dialog-note">
          CSV 来源 <code>{arrayPath}</code>
        </p>
      ) : (
        <p className="dialog-note">源数据包含数组时可以导出 CSV。</p>
      )}
    </Dialog>
  );
}
