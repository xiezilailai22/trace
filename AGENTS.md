## Project Structure
- `src/` - 主要源代码目录
- `src/components/` - React 组件（使用函数式组件 + Hooks）
- `src/utils/` - 工具函数（纯函数，需要单元测试）
- `tests/` - 测试文件（使用 Vitest）

## 技术栈
- Next.js 14
- TypeScript 5.0
- Tailwind CSS
- React Router

## Coding Conventions
- 使用 TypeScript，启用严格模式
- 组件命名：PascalCase（例如：`UserProfile.tsx`）
- 工具函数命名：camelCase（例如：`formatDate.ts`）
- CSS 使用 Tailwind CSS，避免内联样式
- 异步函数必须有错误处理

## 编码规范
- 使用 ESLint + Prettier
- 组件使用 PascalCase 命名
- 文件使用 kebab-case 命名
- 优先使用函数组件和 Hooks

## Testing Guidelines
- 测试框架：Vitest + React Testing Library
- 每个工具函数必须有单元测试
- 组件测试覆盖主要交互流程
- 运行测试：`pnpm test`
- 覆盖率目标：80%+

## PR Guidelines
- 分支命名：`feature/`, `fix/`, `refactor/`
- Commit 信息：遵循 Conventional Commits
- PR 标题格式：`[类型] 简短描述`
- 必须通过：lint, typecheck, 所有测试

## Tool Priority
- 文件名搜索：使用 `fd`
- 文本内容搜索：使用 `rg` (ripgrep)
- 代码结构搜索：使用 `sg` (ast-grep)
- 排除目录：`.git`, `node_modules`, `dist`, `coverage` , `document`

## 回复
- Always respond in Chinese-simplified