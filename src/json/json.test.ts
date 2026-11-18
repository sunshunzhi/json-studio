import { describe, expect, it } from 'vitest';
import { compareDocuments } from './compare';
import { pathFor, validateJson } from './document';
import { csvToJson, jsonToCsv } from './files';
import { findArrays } from './table';
import { transformJson } from './transform';

function parse(text: string) {
  const result = validateJson(text);
  if (result.state !== 'valid') throw new Error(`Expected valid JSON: ${text}`);
  return result.document;
}

describe('JSON 文档', () => {
  it('定位不符合严格 JSON 语法的位置', () => {
    expect(validateJson('{\n  "a": 1,\n}')).toMatchObject({ state: 'invalid', line: 3, column: 1 });
    expect(validateJson('{"a": /* comment */ 1}')).toMatchObject({ state: 'invalid' });
    expect(validateJson('false')).toMatchObject({ state: 'valid' });
  });

  it('排序和压缩保留长整数、重复键以及字符串中的空格', () => {
    const text = '{"z": "a b", "2": 9007199254740993, "10": 1e-7, "2": -0}';
    const document = parse(text);
    expect(transformJson('minify', text, document)).toBe(
      '{"z":"a b","2":9007199254740993,"10":1e-7,"2":-0}',
    );
    const sorted = transformJson('sort', text, document);
    expect(transformJson('minify', sorted, parse(sorted))).toBe(
      '{"10":1e-7,"2":9007199254740993,"2":-0,"z":"a b"}',
    );
  });

  it('转义与反转义保留原始字符串', () => {
    const text = '一行\r\n"引号"\\第二行';
    const escaped = transformJson('escape', text);
    expect(transformJson('unescape', escaped, parse(escaped))).toBe(text);
  });

  it('结构对比忽略对象顺序和等价数字写法，同时保留精度', () => {
    const before = parse('{"a.b":[9007199254740992, 1],"n":100.00,"zero":-0}');
    const after = parse('{"zero":0,"n":1e2,"a.b":[9007199254740993, 1, null]}');
    expect(compareDocuments(before, after).map(({ path }) => path)).toEqual([
      '$["a.b"][0]',
      '$["a.b"][2]',
    ]);
  });
});

describe('CSV 导入导出', () => {
  it('支持引号、换行、前导零和嵌套数组路径', () => {
    const csv = 'name,id\r\n"张三,测试",001\r\n"两\n行",002';
    expect(JSON.parse(csvToJson(csv))).toEqual([
      { name: '张三,测试', id: '001' },
      { name: '两\n行', id: '002' },
    ]);
    const json = parse(`{"records": ${csvToJson(csv)}}`);
    const [array] = findArrays(json.root);
    expect(pathFor(array)).toBe('$.records');
    expect(jsonToCsv(json, array)).toBe(csv);
  });

  it('保留特殊列名并拒绝列数不匹配的行', () => {
    expect(csvToJson('__proto__,constructor\n001,002')).toContain('"__proto__": "001"');
    expect(() => csvToJson('id,name\n1')).toThrow('列数与表头不同');
  });
});
