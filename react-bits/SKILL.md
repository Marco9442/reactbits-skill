---
name: react-bits
description: Fetch current React Bits component source and dependencies for React projects, including animated UI, text effects, cursor and hover effects, and WebGL or canvas backgrounds. Use when adding React Bits components or checking their code, props, or installation requirements.
---

# React Bits

从 React Bits 官方 registry 获取当前组件源码和依赖，不凭记忆编写组件实现、猜测属性或依赖。无法访问 registry 时说明失败，不用回忆的代码替代。此 Skill 只维护组件目录和获取工具，不缓存或打包组件源码。

## 路径与运行环境

需要 Node.js 22+；使用 `--install` 还需要 npm。无需安装此 Skill 自身的依赖。

- `SKILL_DIR`：当前 `SKILL.md` 所在目录的**绝对路径**，不是目标项目目录，也不是仓库根目录。从 Agent 提供的 Skill 路径确定它。
- 工作目录：用户要集成组件的 React 项目根目录（其 `package.json` 所在目录）。
- `--dest`：相对于工作目录解析；也可使用绝对路径。默认 `src/components`。保留 registry 文件的子目录，例如 `BlurText/BlurText.tsx`。同名文件会被覆盖；先检查已有修改。
- `--install`：在当前工作目录执行 npm install，不会根据 `--dest` 自动切换项目。使用其他包管理器的项目，应省略此参数并通过项目现有包管理器安装返回的依赖。

```bash
SKILL_DIR="/absolute/path/to/react-bits"
cd /absolute/path/to/target-react-project
node "$SKILL_DIR/scripts/rb-add.mjs" --list
node "$SKILL_DIR/scripts/rb-add.mjs" BlurText --variant TS-TW --dest src/components
# 需要在当前项目安装依赖时：
node "$SKILL_DIR/scripts/rb-add.mjs" BlurText --variant TS-TW --dest src/components --install
```

支持同时传入多个组件名。变体为 `JS-CSS`、`JS-TW`、`TS-CSS`、`TS-TW`；脚本默认 `TS-TW`，具体可用性以实时 registry 为准。

## 工作流程

1. 根据目标项目选择 JS/TS 和 CSS/Tailwind 变体；确实无法判断时再询问。
2. 搜索 [references/catalog.md](references/catalog.md) 中的分类、描述和依赖，或用 `--list` 读取实时组件名。离线目录可能滞后，其中依赖是 TS-TW 元数据摘要。
3. 从目标项目根目录运行上述绝对路径脚本，获取指定变体的全部文件。组件源码和安装依赖始终以 `https://reactbits.dev/r/` 返回的当前数据为准。
4. 阅读下载文件自身的 props 类型、默认值、导入和使用要求，再集成到项目。不要猜测属性名称或默认值。
5. 安装脚本输出的依赖及版本范围，使用项目已有包管理器；检查 CSS 导入、Tailwind 配置和项目构建。可做必要的兼容性修改，不重写组件实现。

## 无脚本访问时

直接获取官方 JSON，校验响应状态、JSON 结构和 `files[].content`，并保存全部文件：

```bash
curl -fsS 'https://reactbits.dev/r/BlurText-TS-TW.json'
curl -fsS 'https://reactbits.dev/r/registry.json'
```

组件地址格式为 `https://reactbits.dev/r/<Name>-<variant>.json`。索引用于发现组件及变体，不包含组件源码。

## 注意事项

- **HTTP 200 不代表成功**：未知路径可能返回 SPA HTML 页面，必须验证 JSON 内容。
- **Scoped dependencies**：例如 `@react-three/fiber@^9.3.0`，不能简单按 `@` 分割。脚本已处理包名和版本范围。
- **多文件**：CSS 变体通常包含组件文件和同级 CSS；始终保存 registry 返回的全部文件，而非假定只有一个文件。
- **分类**：目录生成器从官方 `llms.txt` 读取分类和描述，并与官方 registry 核对；registry 没有分类字段。
- **TypeScript**：若项目启用 `verbatimModuleSyntax`，按需将类型导入拆成 `import type`，不要因此重写组件。

## 更新目录

GitHub Action 每日重新生成目录。手动更新：

```bash
node "$SKILL_DIR/scripts/gen-catalog.mjs"
```

生成器始终写入自身 Skill 的 `references/catalog.md`，不受当前工作目录影响。组件数量及分类数量由生成器计算，不在本说明中固定。
