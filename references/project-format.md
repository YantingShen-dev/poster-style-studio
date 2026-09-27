# 工程与接力

## 格式

底座使用 UTF-8 JSON 单文件，扩展名 `.posterproj`，format 为 `poster-style-studio`，当前 version 为 `2`。资源以 data URL 内嵌，离线自包含，不依赖 ZIP 库。读取旧 v1 时自动升级，保留对象与素材；保存为 v2。旧版工具会拒绝 v2 工程，接力时须一起交付新版工具，避免蒙版被静默忽略。

根字段：`format, version, id, name, canvas, objects, assets, fonts, style, animation, savedAt`。

- `canvas`: `width,height,background`，透明用 `transparent`。
- `objects`: 按从后到前的顺序保存；同 parentId 的对象顺序决定叠放。每个对象保存 `id,type,name,parentId,m,visible,locked,hitTest,opacity,fill,fillPaint,stroke,strokeWidth,blendMode,shadow,glow`。矩阵 `m=[a,b,c,d,e,f]` 表示局部到父级。对象类型为 `rect,ellipse,line,polygon,star,path,text,image,group`。旧工程缺少 `fillPaint` 和 `blendMode` 时按纯色与正常混合处理。
- `hitTest` 默认 `true`；设为 `false` 时对象仍可从图层面板选择和编辑，但不会挡住画布上位于其下方的对象。锁定对象及锁定父组的子对象也不参与画布指针命中。全画布纸纹、网点等装饰覆盖层应同时设置 `locked:true` 与 `hitTest:false`。旧工程缺少该字段时按 `true` 处理。
- `fillPaint`: `{type,gradient,pattern}`，类型为 `solid,gradient,pattern`。渐变保存 `{kind,angle,reverse,from,to,stops}`，其中 `stops` 为至少两个 `{id,position,color}` 节点，`position` 在 0–1；旧工程仅有 `from/to` 时按两个端点读取，kind 为 `linear,radial,conic`；图案保存 `{assetId,scale,rotation,size}`，以工程内嵌 PNG/JPEG 图片作重复填充。`fill='none'` 时暂停绘制填充但保留设置。`blendMode` 为 `normal,multiply,screen,overlay,plus-lighter,plus-darker` 之一。
- 几何对象保存 `w,h`；路径保存 `nodes`（`x,y,inX,inY,outX,outY`）与 `closed`；文字保存 `text,fontFamily,fontSize,fontWeight,fontStyle,letterSpacing,lineHeight,textAlign`，其中 `w,h` 是文本框尺寸。
- 对象可选 `warp={box,points}`；`box={x,y,w,h}` 是原始局部区域，`points` 按左上、右上、右下、左下保存四个局部坐标，表示可继续编辑的透视变形。普通斜切保存在矩阵 `m` 中。图片的 `stroke/strokeWidth` 作用于可见像素外沿。
- 对象可选 `editorState={keepRatio,sections}`，分别记录自身的等比选择与 `fill,crop,stroke,shadow,glow` 分组展开状态；值均为布尔值。旧工程缺失时使用该对象类型的默认值。状态随工程／草稿保存，复制时深拷贝，之后独立修改。多选整体变换的临时面板设置不回写各单个对象。对象外观仍由各自的填充、描边、效果等字段保存。
- 图层文件夹采用 `group` 与 `parentId`。剪贴蒙版组额外保存 `maskId`，必须指向该组的一个直接子闭合形状；渲染时只把它用作 clipPath，不画出该形状本身。复制组时重映射引用，解除蒙版保留子对象。单独移走、删除或打组蒙版形状前先解除；生成器不能留下悬空引用。
- 图片保存 `assetId` 和 `crop={x,y,w,h}`（0–1 归一化源图裁切）。资源保存实际内容和 mime，不引用本机文件。
- `assets`: 以资源 ID 为键，值为 `{id,mime,data,name}`；图像支持 PNG/JPEG/WebP，字体支持 TTF/OTF/WOFF/WOFF2。SVG 作为图片导入时需先可靠净化或栅格化，不能直接执行任意外部内容。
- `fonts`: `{family,assetId,weight,style}` 数组，字体由资源注册。无法嵌入的系统字体应在交付说明中列出。
- `style`: `{id,version,modules,params,palette,stickers,gradientPresets?}`。模块项为 `{id,version}`；参数必须是纯数据。贴纸项 `{name,objects}` 可引用同项目资源，实例化时重新分配对象 ID。用户保存的渐变模板留在可选 `gradientPresets` 数组。
- `animation`: `{enabled,duration,fps,amplitude,objectIds}`；底座可选模块支持确定时间采样的整体呼吸缩放。具体点阵半径动画应由风格模块实现，不冒充已具有。

用 `PosterCore.createProject()`、`PosterCore.createObject(type, overrides)` 生成合法默认值。用 `validateProject` 校验完整对象；不要自行跳过验证。脚本可加载源码并使用相同函数创建初始工程。

## 完整性与版本

校验格式版本、ID 唯一性、类型、父子关系与循环、有限数值、矩阵可逆、资源引用、图片格式、字体引用、动画对象。校验和资源准备成功后再替换当前工程。旧工程尚无迁移路线时明确拒绝不兼容版本，不截断字段继续保存。

工程保存可编辑状态，默认不携带历史记录；打开后建立新的历史。隐藏对象和素材同样保留。删除对象后未使用资源可暂保留，以保持撤销和贴纸引用；不能在删除操作中直接清除仍被引用的图片。

文件只保存数据。扩展执行逻辑在已交付的工具中注册，不能从导入工程加载 JavaScript 或远程模块。专属生成器保存随机种子、参数、稳定生成对象 ID 和当前几何。缺模块时保留几何基础编辑并明确降级，不能称完整兼容。

## 交付与恢复

目标目录根部的单文件 `index.html` + `.posterproj` 构成首次本地接力的最小交付；同目录 `site/index.html` 是部署到静态网页托管时的入口，已内嵌初始工程和素材。后续双方已有同一兼容工具，单独传工程即可。保存工程不会保存网页新加的程序代码；修改风格模块后要重新交付对应工具。静态托管不提供工程实时同步。

同一字体在另一台电脑未安装时可能替换；优先嵌入用户提供且能分发的字体资源。无法保证的字体明确列出。工具打开后显示缺失字体提示，用户选择替代不能默默修改。

测试：在新浏览器上下文／无草稿环境载入；验证图层树、矩阵、文字、曲线控制点、图片裁切、阴影发光和参数。改文字与节点、再保存、重新打开。两端不仅外观一致，而且对象可继续编辑。
