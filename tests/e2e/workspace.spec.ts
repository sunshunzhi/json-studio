import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { exampleText } from '../../src/workspace/example';

test('编辑、校验、定位和查询', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${message.text()} (${message.location().url})`);
  });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page).toHaveTitle('JSON Studio');
  const source = page.getByRole('textbox', { name: 'JSON 源数据' });
  await expect(source).toContainText('JSON Studio');
  await page.getByRole('button', { name: '压缩', exact: true }).click();
  await expect(page.getByText('1 行', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '格式化', exact: true }).click();
  await expect(
    page.getByText(`${exampleText.split('\n').length} 行`, { exact: true }),
  ).toBeVisible();

  await page.getByRole('searchbox', { name: '搜索键或值' }).fill('李四');
  await page.getByRole('button', { name: /name.*李四/ }).click();
  await expect(page.locator('.path-bar code')).toHaveText('$.users[1].name');
  await page.getByRole('tab', { name: '表格' }).click();
  await expect(page.getByRole('table')).toContainText('王五');
  await page.getByRole('tab', { name: '关系图' }).click();
  await expect(page.locator('.react-flow__node').first()).toBeVisible();

  await page.getByRole('button', { name: '运行查询' }).click();
  const results = page.getByRole('dialog', { name: '查询结果' });
  await expect(results).toContainText('共 3 条结果');
  await expect(results).toContainText('张三');
  await results.getByRole('button', { name: '复制结果' }).click();
  await expect(results.getByRole('status')).toHaveText('已复制查询结果');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('张三');
  await results.getByRole('button', { name: '关闭' }).click();
  await page.getByLabel('查询语言').selectOption('jq');
  await page.getByRole('button', { name: '运行查询' }).click();
  await expect(results).toContainText('共 3 条结果', { timeout: 14_000 });
  await expect(results).toContainText('李四');
  await results.getByRole('button', { name: '关闭' }).click();

  await source.fill('0');
  await page.getByLabel('查询语言').selectOption('jsonpath');
  await page.getByLabel('查询表达式').fill('$');
  await page.getByRole('button', { name: '运行查询' }).click();
  await expect(results.locator('.query-output')).toContainText('0');
  await results.getByRole('button', { name: '关闭' }).click();

  await source.fill('{"a": 1,}');
  await expect(page.getByRole('button', { name: /第 1 行/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '运行查询' })).toBeDisabled();
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(page.getByText('JSON 有效', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('导入、结构与文本对比、导出和保存', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({
    name: 'users.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('name,id\n王五,001'),
  });
  const source = page.getByRole('textbox', { name: 'JSON 源数据' });
  await expect(source).toContainText('001');
  await page.getByRole('tab', { name: '对比' }).click();
  await page.getByRole('textbox', { name: 'JSON 对比数据' }).fill('[{"id":"002","name":"王五"}]');
  await page.getByRole('button', { name: '对比', exact: true }).click();
  await expect(page.getByText('1 处差异', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '$[0].id', exact: true })).toBeVisible();
  await page.getByLabel('对比方式').selectOption('text');
  await page.getByRole('button', { name: '对比', exact: true }).click();
  await expect(page.locator('.text-diff .diff-added')).toContainText('002');

  await page.getByRole('button', { name: '导出', exact: true }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 CSV' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('users.csv');
  expect(await readFile(await download.path(), 'utf8')).toBe('name,id\r\n王五,001');

  await expect(page.getByText('已保存到本机', { exact: true })).toBeVisible();
  await page.reload();
  await expect(source).toContainText('001');
  await page.getByRole('button', { name: '清空', exact: true }).click();
  await expect(page.getByText('还没有源数据')).toBeVisible();
});

test('关系图按数组索引分组，曲线连接嵌套项并支持展开和翻页', async ({ page }) => {
  const issues: string[] = [];
  page.on('pageerror', (error) => issues.push(error.message));
  page.on('console', (message) => {
    if (['warning', 'error'].includes(message.type())) issues.push(message.text());
  });
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'JSON 源数据' })
    .fill(
      JSON.stringify([
        'alpha',
        false,
        null,
        [],
        [4, 5],
        { id: 42 },
        ...Array.from({ length: 7 }, (_, index) => index + 100),
      ]),
    );
  await page.getByRole('tab', { name: '关系图' }).click();
  const root = page
    .locator('.json-graph-card')
    .filter({ has: page.getByRole('button', { name: '选择 $', exact: true }) });
  await expect(root.getByText('13 项')).toBeVisible();
  await expect(root.getByRole('button', { name: '[0] "alpha"' })).toBeVisible();
  await expect(root.getByRole('button', { name: '[1] false' })).toBeVisible();
  await expect(root.getByRole('button', { name: '[3] [0]' })).toBeVisible();
  await expect(page.locator('.json-graph-card')).toHaveCount(3);
  const edges = page.locator('.react-flow__edge-path');
  await expect(edges).toHaveCount(2);
  await expect(edges.first()).toHaveAttribute('d', /C/);

  const nested = page
    .locator('.json-graph-card')
    .filter({ has: page.getByRole('button', { name: '选择 $[5]', exact: true }) });
  await nested.getByRole('button', { name: 'id 42' }).click();
  await expect(page.locator('.path-bar code')).toHaveText('$[5].id');
  await expect(page.locator('.graph-edge-active')).toHaveCount(1);
  await root.getByRole('button', { name: '折叠 $[5]', exact: true }).click();
  await expect(nested).toHaveCount(0);
  await expect(edges).toHaveCount(1);
  await root.getByRole('button', { name: '展开 $[5]', exact: true }).click();
  await expect(nested).toBeVisible();
  await expect(edges).toHaveCount(2);

  await root.getByRole('button', { name: '$ 下一页', exact: true }).click();
  await expect(root.getByRole('button', { name: '[12] 106' })).toBeVisible();
  await expect(root.getByRole('button', { name: '[0] "alpha"' })).toHaveCount(0);
  await expect(edges).toHaveCount(0);
  await page.getByRole('button', { name: '适应画布' }).click();
  await expect(root.getByText('2 / 2')).toBeVisible();
  expect(issues).toEqual([]);
});

test('窄屏布局和主题切换', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const workspace = page.locator('.workspace');
  await expect(page.getByRole('tab', { name: '树形' })).toBeVisible();
  expect(await workspace.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('tab', { name: '关系图' }).click();
  await expect(page.locator('.graph-scale')).toHaveText(/^(6[4-9]|7\d|80)%$/);
  const arrayCard = page.locator('.json-graph-card.is-array').first();
  const overflow = await arrayCard.evaluate(
    (card) =>
      card.getBoundingClientRect().right -
      card.closest('.graph-view')!.getBoundingClientRect().right,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: '切换到深色模式' }).click();
  await expect(workspace).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.source-panel .cm-editor')).toHaveCSS(
    'background-color',
    'rgb(27, 35, 49)',
  );
  await page.getByRole('button', { name: '使用指南' }).click();
  await expect(page.getByRole('dialog', { name: '使用指南' })).toBeVisible();
});
