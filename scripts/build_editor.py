#!/usr/bin/env python3
"""Bundle the editor into a portable HTML file without downloading dependencies."""
import argparse
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ('index.html', 'editor.css', 'core.js', 'render.js', 'style.js', 'initial.js', 'selection.js', 'workspace.js', 'editor.js')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', type=Path)
    parser.add_argument('--source', type=Path, default=ROOT / 'assets' / 'editor')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    source, output = args.source.resolve(), args.output.resolve()
    if output.exists() and any(output.iterdir()):
        parser.error('Output directory is not empty. Choose a new output directory.')
    for name in FILES:
        if not (source / name).is_file():
            parser.error(f'Missing source file: {name}')
    if args.project:
        subprocess.run(['node', str(ROOT / 'scripts' / 'validate_project.cjs'), str(args.project.resolve())], check=True)
        project = json.loads(args.project.read_text(encoding='utf-8-sig'))
        initial = 'window.POSTER_INITIAL=' + json.dumps(project, ensure_ascii=False).replace('<', '\\u003c') + ';\n'
    else:
        initial = (source / 'initial.js').read_text(encoding='utf-8')
    for name in FILES:
        if name.endswith('.js'):
            subprocess.run(['node', '--check', str(source / name)], check=True)
    html = (source / 'index.html').read_text(encoding='utf-8')
    html = html.replace('<link rel="stylesheet" href="editor.css">', '<style>\n' + (source / 'editor.css').read_text(encoding='utf-8') + '\n</style>')
    for name in FILES:
        if name.endswith('.js'):
            code = initial if name == 'initial.js' else (source / name).read_text(encoding='utf-8')
            code = code.replace('</script', '<\\/script').replace('</SCRIPT', '<\\/SCRIPT')
            html = html.replace(f'<script src="{name}"></script>', '<script>\n' + code + '\n</script>')
    output.mkdir(parents=True, exist_ok=True)
    sources = output / 'source'
    sources.mkdir()
    for name in FILES:
        shutil.copyfile(source / name, sources / name)
    (sources / 'initial.js').write_text(initial, encoding='utf-8')
    (output / 'index.html').write_text(html, encoding='utf-8')
    site = output / 'site'
    site.mkdir()
    (site / 'index.html').write_text(html, encoding='utf-8')
    if args.project:
        (output / 'initial.posterproj').write_text(json.dumps(project, ensure_ascii=False, indent=2), encoding='utf-8')
    (output / '使用说明.txt').write_text(
        '双击 index.html 打开本地工作台，不需要安装依赖。\n'
        '需要云端使用时，将 site 目录整体上传到静态网页托管服务，入口是 site/index.html；网页的脚本、样式和初始作品已内嵌。\n'
        '静态网页可由多人打开，但不会自动同步编辑；协作时仍需用 .posterproj 工程文件接力。\n'
        '打开工程：选择 .posterproj 文件。保存工程：将当前全部对象和素材保存到文件。\n'
        '首次接力请传递 index.html 和工程文件；双方工具版本一致后只需传递工程。\n'
        'Ctrl+S 保存，Ctrl+O 打开，Ctrl+Z 撤销，Ctrl+Shift+Z 重做。\n'
        'Ctrl+滚轮缩放视图，普通滚轮平移，空格拖动画布，Shift 多选，Alt 拖动暂停吸附。\n'
        '左侧选择绘图工具后在画布拖拽创建；V 返回选择，H 手形，P 钢笔，N 节点。\n'
        '拖动侧栏分隔线调整宽度；拖动图层标题浮动或停靠两侧；图层面板底边上下拖动调高。\n'
        '右上角恢复视图将画布居中；画布大小弹窗设置尺寸与背景，新建默认透明。\n'
        '双击组进入内部编辑，组外淡化；Esc 或退出组返回上一级。方向键微移 1，Shift 加速为 10。\n'
        '每个元素独立保存属性分组展开和等比选择，随工程接力；多选设置不覆盖单个元素。\n'
        '渐变色带可点击新增颜色节点，拖动节点调整位置，并逐个改色、删除；可保存多色模板。\n'
        '图片的描边作用于可见像素外沿。画布对象右键可复制、剪切、粘贴、打组、解组、翻转、斜切与透视；右侧变换区也有斜切和透视。拖动边或角调整变形，Esc 退出变形编辑。\n'
        '钢笔：点击直线点、拖拽曲线点，Enter 结束；节点模式可编辑点与控制柄。\n'
        '空心图形内部可点击；左向右完整框选，右向左触碰框选。\n'
        '图层：行边缘拖动排序，文件夹中部移入，顶层区域移出；支持打组、解组和删除。\n'
        '向下蒙版：图片在上，闭合形状在下；选中图片点击图层面板右下角的蒙版图标，再点一次解除；保留原图与可编辑轮廓。\n'
        '双击文字框原位编辑；Enter 换行，Ctrl+Enter 完成，Esc 取消，点击外部完成。\n'
        '拖动文字框边角只调整排版区域，文字自动换行且字号不变；文字大小通过字号调整。\n'
        '字体菜单提供中英文常用字体，并标记本机可用性；缺失字体可通过导入字体内嵌。\n'
        '工程 v2 支持蒙版，可读取旧 v1。与伙伴接力时请同步新版工具。\n'
        'SVG 内图片仍为位图。PDF 使用浏览器打印，关闭页眉页脚并保持 100% 缩放。\n'
        'source 目录是工具源码；修改后需重新打包才能更新单文件工具。\n', encoding='utf-8')
    print(f'Created local workbench: {output / "index.html"}')
    print(f'Created deployable site: {site / "index.html"}')


if __name__ == '__main__':
    main()
