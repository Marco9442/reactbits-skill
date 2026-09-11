# reactbits-skill

面向通用 Agent 的 React Bits Skill。先读取组件目录，再从 `https://reactbits.dev/r/` 官方 registry 获取当前组件源码和依赖，不凭记忆重写，不缓存或打包组件源码。

## 使用

需要 Node.js 22+，Skill 本身无第三方运行依赖。

```bash
git clone https://github.com/Marco9442/reactbits-skill.git
```

将完整的 `react-bits/` 文件夹放入 Agent 支持的 Skill 目录，或让 Agent 直接读取其中的 `SKILL.md`。保留 `scripts/` 和 `references/` 的相对位置。不要求特定 Agent 或插件市场。

也可以独立调用脚本：

```bash
# 替换为实际绝对路径；它指向 SKILL.md 所在目录
SKILL_DIR="/absolute/path/to/reactbits-skill/react-bits"
cd /absolute/path/to/target-react-project
node "$SKILL_DIR/scripts/rb-add.mjs" --list
node "$SKILL_DIR/scripts/rb-add.mjs" BlurText --variant TS-TW --dest src/components
```

默认变体 `TS-TW`；可选 `JS-CSS`、`JS-TW`、`TS-CSS`、`TS-TW`，实际可用变体由实时索引决定。支持同时获取多个组件。

`--dest` 相对于当前工作目录，默认 `src/components`；保留官方文件子目录，已有同名文件会被覆盖。脚本打印依赖安装命令；`--install` 在当前工作目录运行 npm install。其他包管理器项目请按输出依赖使用项目已有工具安装。下载后阅读实际 props 和导入，再执行项目构建验证。

## 目录

```text
.github/workflows/update-catalog.yml
.gitignore
README.md
react-bits/
├── SKILL.md
├── references/catalog.md
└── scripts/
    ├── gen-catalog.mjs
    └── rb-add.mjs
```

## 自动更新

`Update React Bits catalog` 每日在 UTC 03:17（北京时间 11:17）计划运行，也支持 Actions 页面上的 **Run workflow**。计划运行时间可能延迟；有目录变化才提交。workflow 显式授予 `contents: write`，以便推送生成结果。

手动刷新（任意工作目录均可）：

```bash
node "$SKILL_DIR/scripts/gen-catalog.mjs"
```

目录由官方 `llms.txt` 的分类和描述与官方 registry 的组件和依赖交叉核对生成。网络、响应或数据不匹配时失败，不用错误结果覆盖目录。实际组件下载不依赖目录是否更新。

## 维护与选择性同步

社区工具仓库与 React Bits 官方 registry 是两类来源：前者只用于人工评估工具改进，组件始终从官方 registry 下载。

本仓库以社区仓库 `Philotheephilix/reactbits.dev-skill` 的提交 `b869cc2345a0349f4b1af234dccb97913bd40a84` 为初始对照点，使用独立提交历史。以后按需比较，不整仓合并：

```bash
# 在本仓库根目录运行；upstream 已存在时跳过 add
git remote add upstream https://github.com/Philotheephilix/reactbits.dev-skill.git
git fetch upstream
BASE=b869cc2345a0349f4b1af234dccb97913bd40a84
git log --oneline "$BASE"..upstream/main -- react-bits/ .github/workflows/update-catalog.yml
git diff "$BASE" upstream/main -- react-bits/scripts/ react-bits/SKILL.md .github/workflows/update-catalog.yml
```

在独立分支上手动移植值得保留的脚本修复或 Skill 指导；单一、干净的修复提交也可 `git cherry-pick -n <commit>` 后审查。不要整仓覆盖，避免恢复宣传页面或特定平台分发配置。自动生成的 catalog 不手工合并，重新运行生成器即可。

同步后至少验证：

```bash
node react-bits/scripts/gen-catalog.mjs
node react-bits/scripts/rb-add.mjs --list
TEST_DIR="$(mktemp -d)"
node react-bits/scripts/rb-add.mjs BlurText --variant TS-TW --dest "$TEST_DIR"
```

检查文件和依赖输出，提交后手动运行一次更新 workflow。记录已审查的 upstream 提交作为下一次 `BASE`；不要把本仓库提交当作社区仓库的比较基线。
