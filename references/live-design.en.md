# Live Design Interface

Users can type or speak design requests in Codex. The Agent uses `live_design.cjs` locally to control the open workbench; the browser applies changes through the editor's project model, validation, and undo history. The page does not call a model and static deployment does not require the service.

## Connect

Run `node live_design.cjs serve <workbench-directory>` in the generated directory. The service binds only to loopback; open the complete URL it prints. Codex may start it in the background and open the URL locally. An old `file://` tab does not connect automatically: save its project first, then open that project in the local-service page. Human edits and Agent edits affect the same in-memory project; continue saving `.posterproj` files regularly.

```sh
node /path/to/workbench/live_design.cjs status /path/to/workbench
node /path/to/workbench/live_design.cjs inspect /path/to/workbench
node /path/to/workbench/live_design.cjs inspect /path/to/workbench /path/to/current.posterproj
node /path/to/workbench/live_design.cjs call /path/to/workbench /path/to/command.json
```

`inspect` returns the revision, object IDs/types/names/positions/sizes, selection, and style modules; with an output path it writes the full project. `status` checks whether the browser is connected. Every write command includes the last-read `expectedRevision`. If a human edits in the meantime, the stale command is rejected; inspect again and merge intent instead of overwriting the canvas with old data.

## Commands

`call` reads one UTF-8 JSON command. Example:

```json
{"action":"batch","expectedRevision":7,"operations":[
  {"action":"create","objects":[{"type":"text","name":"Headline","text":"New title","m":[1,0,0,1,120,80],"w":680,"h":140,"fontSize":92}]},
  {"action":"update","changes":[{"id":"existing-object-id","props":{"fill":"#243a80","shadow":{"enabled":true,"blur":12}}}]}
]}
```

`batch` commits one undoable transaction. It supports `create`, `update`, `move`, `delete`, `duplicate`, `group`, `ungroup`, `align`, `distribute`, `layer_create`, `layer_move`, `reorder`, `mask`, `unmask`, `flip`, `sticker_insert`, `sticker_save`, `canvas`, `animation`, `project_name`, `style`, and `style_params`. Objects use the same properties as the UI: matrices, text, path nodes, fills/gradient stops/patterns, strokes, opacity, blend modes, shadows, glows, crop, perspective, layers, and component parameters. Prefer `create` for defaults; update by ID with nested partial merges. Use `style_params` for generators so visible geometry regenerates immediately.

Standalone `select`, `undo`, `redo`, `fit`, `view`, `tool`, `enter_group`, `exit_group`, `frame`, `save`, `import_asset`, and `replace_project` also require `expectedRevision`. View/tool/group-edit/frame are page state and do not advance the project revision. `import_asset` accepts an `asset` in project-resource format and an optional `font`; decode images and load fonts before committing. `replace_project` starts from the current complete project and preserves human work/assets; validation and undo still apply. Read-only `inspect` and `svg` need no revision. `export` needs a revision and supports SVG, PNG, and JPG; the fourth CLI argument can name the local output file. Export frame-by-frame PNGs by sampling time repeatedly or through the UI.

## Design operation

Inspect first and identify the referenced objects, canvas, and style components; never guess IDs from layer order. Translate aesthetic intent into hierarchy, scale, alignment, whitespace, contrast, color, and texture density. Prefer semantic parameters for style-specific elements and common properties for ordinary objects. After related changes, inspect the page or an exported preview and refine. Ask briefly before choices that materially change visual direction; direct control does not remove the user's design decisions.

The bridge controls one local canvas and is not multiplayer synchronization. Remote static pages still exchange project files; cross-device live collaboration needs a separate shared-storage and sync layer.
