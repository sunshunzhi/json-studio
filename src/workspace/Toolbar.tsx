import {
  ArrowDownAZ,
  Code,
  Download,
  FlaskConical,
  RemoveFormatting,
  Shuffle,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Transform } from '../json/transform';
import { Button } from '../ui/controls';

const transforms = [
  { id: 'format', label: '格式化', icon: Sparkles },
  { id: 'minify', label: '压缩', icon: Shuffle },
  { id: 'sort', label: '按键排序', icon: ArrowDownAZ },
  { id: 'escape', label: '转义', icon: Code },
  { id: 'unescape', label: '反转义', icon: RemoveFormatting },
] as const;

export function Toolbar({
  onTransform,
  onExample,
  onClear,
  onImport,
  onExport,
}: {
  onTransform: (action: Transform) => void;
  onExample: () => void;
  onClear: () => void;
  onImport: () => void;
  onExport: () => void;
}) {
  return (
    <div className="toolbar" role="group" aria-label="JSON 工具">
      <div className="toolbar-group">
        {transforms.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            icon={<Icon size={17} />}
            variant={id === 'format' ? 'primary' : undefined}
            onClick={() => onTransform(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="toolbar-group toolbar-edit">
        <Button icon={<FlaskConical size={17} />} onClick={onExample}>
          示例
        </Button>
        <Button icon={<Trash2 size={17} />} onClick={onClear}>
          清空
        </Button>
      </div>
      <div className="toolbar-group toolbar-file">
        <Button icon={<Upload size={17} />} onClick={onImport}>
          导入
        </Button>
        <Button variant="primary" icon={<Download size={17} />} onClick={onExport}>
          导出
        </Button>
      </div>
    </div>
  );
}
