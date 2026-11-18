export const exampleName = 'example.json';
export const exampleText = JSON.stringify(
  {
    name: 'JSON Studio',
    version: '1.0.0',
    description: '让数据，一目了然',
    users: [
      { id: 1, name: '张三', role: 'admin', active: true },
      { id: 2, name: '李四', role: 'editor', active: true },
      { id: 3, name: '王五', role: 'viewer', active: false },
    ],
    meta: { total: 3, page: 1, success: true },
  },
  null,
  2,
);
