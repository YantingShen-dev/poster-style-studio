# 实时设计接口

用户可在 Codex 中输入或口述设计要求。Agent 在本机通过 `live_design.cjs` 调用已打开的工作台，浏览器用编辑器自己的工程模型、验证和撤销历史执行操作。网页不调用模型，也不需要为静态部署接入服务。

## 连接

在生成的工作台目录中运行 `node live_design.cjs serve <工作台目录>`。服务只绑定本机回环地址；打开命令打印的完整 URL。可由 Codex 后台启动服务，然后在本机浏览器打开该地址。旧的 `file://` 标签页不会自动连入；先在旧页保存工程，再在本机服务页面打开该工程。用户在页面中手动编辑与 Agent 修改的是同一份内存工程，仍需定期保存 `.posterproj`。

使用绝对路径调用，例如：

```sh
node /path/to/workbench/live_design.cjs status /path/to/workbench
node /path/to/workbench/live_design.cjs inspect /path/to/workbench
node /path/to/workbench/live_design.cjs inspect /path/to/workbench /path/to/current.posterproj
node /path/to/workbench/live_design.cjs call /path/to/workbench /path/to/command.json
```

`inspect` 返回当前修订号、对象 ID、类型、名称、位置与尺寸、选区和风格模块；给输出路径则把完整工程写入该文件。`status` 检查浏览器是否连接。写入命令须带刚读取的 `expectedRevision`；用户中途手动改动会使旧命令被拒绝，重新 `inspect` 后再合并意图，不能用过时数据覆盖画布。

## 命令

`call` 从 UTF-8 JSON 文件读一条命令。常用命令：

```json
{"action":"batch","expectedRevision":7,"operations":[
  {"action":"create","objects":[{"type":"text","name":"主标题","text":"新标题","m":[1,0,0,1,120,80],"w":680,"h":140,"fontSize":92}]},
  {"action":"update","changes":[{"id":"已有对象ID","props":{"fill":"#243a80","shadow":{"enabled":true,"blur":12}}}]}
]}
```

`batch` 内的操作作为一次可撤销事务提交。支持 `create`、`update`、`move`、`delete`、`duplicate`、`group`、`ungroup`、`align`、`distribute`、`layer_create`、`layer_move`、`reorder`、`mask`、`unmask`、`flip`、`sticker_insert`、`sticker_save`、`canvas`、`animation`、`project_name`、`style` 和 `style_params`。对象使用与人工界面相同的属性：矩阵、文字、路径节点、填充、渐变色标、图案、描边、透明度、混合模式、投影、发光、裁切、透视、图层和风格组件参数。创建对象优先用 `create` 继承默认属性；修改时指定对象 ID，嵌套属性局部合并。风格生成器用 `style_params`，以便让可见图形随参数即时再生成。

单独的 `select`、`undo`、`redo`、`fit`、`save`、`import_asset` 和 `replace_project` 也需要 `expectedRevision`。`import_asset` 传入工程资源表格式的 `asset`，导入字体时同时传 `font`；图片先解码、字体先加载，然后才提交到工程。`replace_project` 用于复杂结构修改，但应从当前完整工程开始，保留人工操作和素材；替换前后仍经过校验并可撤销。只读 `inspect` 与 `svg` 不需要修订号。`export` 需修订号，支持 SVG、PNG、JPG，`call` 第四个参数可给本地输出文件。逐帧 PNG 可对每一时间点重复导出并打包，或用人工界面的逐帧导出。

## 设计操作

先读取当前工程，确认用户所指的对象、画布状态与风格组件。不要只根据图层顺序猜对象 ID。将审美意图转成具体调整：信息层级、比例、对齐、留白、对比、色彩、纹理密度等；风格特殊元素优先调其语义参数，普通元素用统一对象属性。提交一组相关变化后，查看工作台画面或导出的预览，按结果继续微调。必要时先简短询问会显著改变视觉方向的选择；不因能自动调用而跳过用户的设计决定。

本地桥接器使 Codex 可直接操作当前网页，但它不提供多人同时编辑。远程静态页面仍靠工程文件接力；若用户以后需要跨设备实时协作，应另建共享存储与同步层。
