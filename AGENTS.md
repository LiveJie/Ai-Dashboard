## 项目协同开发指南（agents.md）

### 1. 这是什么项目

- 单一事实来源：OpenAPI 规范在 [openapi.json](file:///d:/companyProject/dashboard/spec/openapi.json)
- 代码生成入口：运行 [generate.js](file:///d:/companyProject/dashboard/generate.js) 将规范与模板生成到 `backend/` 与 `frontend/`
- 模板目录：`spec/templates/`（例如 [dashboard-page.js](file:///d:/companyProject/dashboard/spec/templates/frontend/dashboard-page.js)）
- 生成器目录：`spec/generators/`

### 2. 目录与职责

- `spec/`
  - `openapi.json`：API、Schema、页面元数据（`x-metadata`）入口
  - `templates/`：可复用的代码模板
  - `generators/`：将规范 + 模板编译成可运行代码
- `backend/`：Express + Sequelize + MySQL 运行时代码（多数为生成产物）
- `frontend/`：React + Vite + MUI 运行时代码（多数为生成产物）

### 3. 生成策略（重要）

当前生成器默认是“安全模式”：

- 默认不会覆盖已存在文件（避免误伤手写逻辑）
- 只有在显式指定 `--force` 时才会覆盖目标文件
- 支持 `--target=...` 做“增量/定向生成”

命令示例（在仓库根目录执行）：

```bash
# 默认：安全增量（不覆盖任何已存在文件）
node generate.js

# 只生成/覆盖前端 dashboard 相关文件（当你修改了 dashboard 模板）
node generate.js --force --target=frontend/dashboard

# 只生成/覆盖后端（全量）
node generate.js --force --target=backend
```

### 4. 修改“原有文件”应该怎么做？

先判断你改的是哪一类文件：

#### A) 改的是生成产物（通常在 frontend/src/** 或 backend/src/**）

- 默认安全模式下，你直接改生成产物不会被下一次 `node generate.js` 覆盖（因为默认跳过已存在文件）
- 但如果未来有人用 `--force` 覆盖了同一个目标，你的改动可能会被重新生成替换

推荐做法：

- 小型项目/快速迭代：允许直接在生成产物上改，等稳定后再把通用逻辑回填到模板
- 中大型项目：把“可复用/可复刻”的改动回填到 `spec/templates/` 或 `spec/generators/`，并用 `--force --target=...` 只更新受影响的模块

#### B) 改的是模板（spec/templates/**）

- 模板改动不会自动影响运行时代码
- 需要执行定向覆盖，将模板应用到对应页面/模块

示例：你改了 [dashboard-page.js](file:///d:/companyProject/dashboard/spec/templates/frontend/dashboard-page.js)

```bash
node generate.js --force --target=frontend/dashboard
```

#### C) 改的是规范（spec/openapi.json）

- 规范改动意味着“应该生成什么”，通常会影响：路由、页面、service、types、后端模型等
- 建议先用默认安全模式生成（避免覆盖），确认新增内容正确
- 若需要刷新某个模块的既有文件，用 `--force --target=...`

### 5. 多人协作约定（推荐）

- 禁止在同一个功能点上“模板改动”和“生成产物改动”同时进行且不回填：会导致后续维护不可预测
- 任何通用能力（可复用 UI、通用筛选、通用 service 行为）优先沉淀到 `spec/templates/` 或 `spec/generators/`
- 对外行为变更（接口字段、必填项、枚举）优先改 `spec/openapi.json`，再生成代码
- 提交前先跑一遍生成器（至少安全模式）：确保规范、模板、生成器之间一致

### 6. 本地运行

在仓库根目录：

```bash
# 生成（默认安全增量）
node generate.js

# 安装依赖
npm run install:all

# 启动前后端
npm run dev
```

后端环境变量参考：

- [backend/.env](file:///d:/companyProject/dashboard/backend/.env)
- `AUTO_SEED`：开发环境是否自动灌入示例数据（true/false）

### 7. 常见坑

- 图标字段：`x-metadata.icon` 目前可能存在 AntD 命名（如 ApiOutlined）与 MUI 图标不一致的问题，需要在前端做映射或统一命名
- 当你需要“刷新已有文件”时，一定要用 `--force`，并尽量加 `--target` 限定范围，避免全量覆盖

