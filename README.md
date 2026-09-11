# reactbits-skill

面向通用 Agent 的 React Bits Skill：读取组件目录，从 [React Bits 官方 registry](https://reactbits.dev/r/registry.json) 获取当前组件源码和依赖。不凭记忆重写组件，不缓存或打包组件源码。

## 使用

需要 **Node.js 22+** 和网络访问，Skill 本身无第三方运行依赖。

```bash
git clone https://github.com/Marco9442/reactbits-skill.git
```

将完整的 `react-bits/` 文件夹放入 Agent 支持的 Skill 目录，或让 Agent 直接读取 [SKILL.md](react-bits/SKILL.md)。保留其中的 `scripts/` 和 `references/`，不依赖特定 Agent 或插件市场。

也可以直接调用脚本：

```bash
# SKILL_DIR 指向 SKILL.md 所在目录，使用实际绝对路径
SKILL_DIR="/absolute/path/to/reactbits-skill/react-bits"
cd /absolute/path/to/target-react-project

node "$SKILL_DIR/scripts/rb-add.mjs" --list
node "$SKILL_DIR/scripts/rb-add.mjs" BlurText --variant TS-TW --dest src/components
```

- **变体**：支持 `JS-CSS`、`JS-TW`、`TS-CSS`、`TS-TW`，默认 `TS-TW`；实际可用性以实时 registry 为准。
- **输出路径**：`--dest` 相对于当前工作目录，默认 `src/components`。保留组件子目录，已有同名文件会被覆盖。
- **依赖安装**：默认打印安装命令；加 `--install` 会在当前工作目录执行 npm install。其他包管理器项目请使用已有工具安装输出的依赖。

下载后读取组件的实际 props 和导入，再完成项目集成与构建验证。

## 自动更新

[GitHub Action](.github/workflows/update-catalog.yml) 每日 **UTC 03:17 / 北京时间 11:17** 计划运行，从官方数据源刷新 [组件目录](react-bits/references/catalog.md)，有变化才提交。也可在 Actions 页面手动运行。

- **目录**随 Action 更新；**组件源码和依赖**在每次调用脚本时从官方 registry 实时获取。
- 不自动修改项目中已下载的组件，不自动合并社区工具仓库的代码改动。
- 本地 Skill 副本需要自行更新；GitHub 上的目录更新不会自动同步到本地。

手动刷新本地目录：

```bash
node "$SKILL_DIR/scripts/gen-catalog.mjs"
```
