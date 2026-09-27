# poster-style-studio · 海报风格工作台

**给一张喜欢的海报参考图，生成一个真正可编辑、可保存工程、可交给伙伴接力创作的网页工作台。**

这个 Skill 帮助 Agent 分析参考图的视觉语言，和用户确认会影响重建方式的选择，再在用户指定的本地目录生成专属 `index.html`、初始 `.posterproj` 工程、预览和可静态部署的 `site/`。不同风格共享同一套编辑底座，同时可以拥有自己的字形生成器、贴纸库和视觉参数。

![CoDay 几何海报工作台](docs/images/coday-geometric-workbench.png)

## 三种风格，同一套编辑底座

下图展示由本 Skill 构建的工作台界面。仓库只收录展示截图，不包含这些活动的完整工程与素材。

| CoDay · 几何海报工作台 | Herstory · 网点海报工作台 | 实战分享 · 像素海报工作台 |
| --- | --- | --- |
| <img src="docs/images/coday-geometric-workbench.png" alt="CoDay 几何海报工作台" width="380"> | <img src="docs/images/herstory-halftone-workbench.png" alt="Herstory 网点海报工作台" width="380"> | <img src="docs/images/pixel-workbench.png" alt="实战分享像素海报工作台" width="380"> |
| 拼块作为可重复添加的矢量贴纸，颜色与结构可重新组合。 | 点阵与线路图形保留专属参数和图层，支持动效扩展。 | 像素字形、窗口和人物贴纸进入同一工程模型。 |

编辑器仍保留通用的选择、变换、图层、钢笔、文字、填充、描边与效果属性：

![对象属性和多色渐变编辑](docs/images/editor-controls.png)

## 安装

需要能读取本地图片和文件、执行 Python 3.10+ 与 Node.js 18+ 的 Agent。生成的网页只需要现代桌面浏览器，离线可用。

把整个仓库克隆到 Codex 的 Skill 目录：

```sh
git clone https://github.com/YantingShen-dev/poster-style-studio.git ~/.codex/skills/poster-style-studio
```

Windows PowerShell 也可使用：

```powershell
git clone https://github.com/YantingShen-dev/poster-style-studio.git "$env:USERPROFILE\.codex\skills\poster-style-studio"
```

请保留 `SKILL.md`、`assets/`、`references/` 和 `scripts/` 的相对位置。安装后给 Agent 一张参考海报，并输入：

> 使用 $poster-style-studio 把这张海报做成可编辑的网页工作台。请先确认保存目录，再生成网页、初始工程和预览。

## 工作流程

1. **读图与沟通**：识别构图、色彩、特殊字形、重复主体与潜在动效；在专属重建前询问真正影响实现的选择。
2. **生成专属工作台**：以 `assets/editor/` 为底座，将风格对象、参数和贴纸写入统一工程模型，输出可打开的网页。
3. **编辑与接力**：在网页中管理图层、绘制路径、修改文字与效果；保存 `.posterproj`，由伙伴打开工程继续创作。
4. **导出与部署**：导出 PNG、JPG、SVG 或浏览器打印 PDF；`site/index.html` 可上传静态托管。静态网页不提供实时多人同步，协作通过工程文件接力。

工作台的基础操作包括图层嵌套与蒙版、画布缩放与对齐、路径节点、图片裁切、纯色／多节点渐变／图案填充、描边、投影、发光及常用混合模式。贴纸以缩略图卡片显示并插入可编辑副本。锁定或标记为 `hitTest:false` 的装饰覆盖层不会拦截下方对象的画布选择。

## 本地构建与验证

从仓库根目录运行：

```sh
python scripts/build_editor.py --output /absolute/path/my-editor
node --test tests/*.test.cjs
python scripts/check_package.py
```

`--output` 必须是空目录。上面第一条命令只生成空白底座；处理参考图时还需建立已初始化的工程，并用 `--project /absolute/path/initial.posterproj` 构建。专属生成器修改后可用 `--source /absolute/path/source` 指定源码。详见 [SKILL.md](SKILL.md) 与 [工程格式](references/project-format.md)。

## 边界与许可

任意参考位图不会自动变成精确矢量；复杂纹理可以保留为内嵌位图。字体跨设备接力时需要检查是否可用或内嵌。SVG 中嵌入的图片仍是位图；PDF 输出依赖浏览器打印。

代码以 [MIT License](LICENSE) 开源。示例截图用于展示工作台界面，不随 Skill 作为海报模板或项目工程分发。
