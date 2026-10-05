# Baseline Capabilities and Behavior

Unless the user narrows scope, every generated tool includes these capabilities. Read source and tests to understand the foundation; do not preserve only a similar appearance.

| Area | Requirements |
| --- | --- |
| Project | New, Save/Save As, Open, manual local-draft recovery; project name and explicit save feedback |
| Layers | Rename, multi-select, order, visibility, lock, group/ungroup, duplicate, delete; preserve hierarchy |
| View | Zoom, Fit, 100%, pan; distinguish view zoom from object scaling |
| Canvas | Custom size, aspect presets, background/transparent; boundary changes do not stretch content by default |
| Transform | Move, size, proportional scaling, rotate, flip, skew, four-corner perspective, multi-selection transform |
| Align | Edge/center snapping, guides, equal-spacing hints, explicit align/distribute |
| Text | Content, family, size, weight, italic, tracking, leading, alignment, multiline frame |
| Shapes | Rectangle, ellipse, line, polygon, star, independently editable paths |
| Pen | Click straight nodes, drag curve nodes, open/closed paths; later add/remove nodes and edit handles |
| Appearance | Solid/linear/radial/conic gradient and tiled PNG/JPG pattern fills; multi-stop gradients with add/drag/color/position/delete and presets; direction/reverse, pattern scale/rotation; stroke, width, caps, joins, opacity, shadow, glow, common blend modes; independent per-object state |
| Images | Upload, replace, proportional display, crop, stroke visible pixel edge, opacity; embed in project |
| Recovery | Undo/redo; one drag is one step; normal text shortcuts remain inside inputs |
| Export | PNG, JPG, SVG, PDF; size/background options; no selection boxes or guides |

Keep Save and Open prominent. Importing a project replaces current work only after successful load and validation. Properties match the selected type; image objects do not show meaningless fill controls.

## Workspace and interaction

- Use a compact left icon toolbar for select, hand, pen, nodes, text, and shapes, with tooltips/shortcuts and active state. Pen is distinct; path commands appear only in pen/node mode.
- Drag shape tools to define bounds; click for defaults. New text enters input immediately. Shift constrains squares, circles, and line angles; return to selection afterward.
- Drag empty space left-to-right for contained selection (solid blue), right-to-left for touch selection (dashed green); Shift adds. Use real outlines, not empty corners of bounding boxes. Ignore shadow/glow/stroke overflow.
- Canvas hits pass through locked objects and `hitTest:false` decoration to editable objects below. Locked layers remain selectable in the panel. Mark full-canvas texture/grain/filter overlays `hitTest:false` in initial projects.
- Filled or unfilled geometry retains an internal hit region; open paths with at least three nodes can also be selected inside. This edit-only hit area does not export. Show eight resize handles plus a usable rotation handle/cursor. Single selection aligns to canvas; multiple selection aligns to bounds; three or more can distribute evenly.
- Drag left/right dividers to resize sidebars; arrow keys adjust a focused divider without affecting artwork. The layer panel can float by dragging its title and dock left/right near zones or by button; its bottom edge resizes height in both modes and remembers it. Restore View centers/fits; Canvas Size opens size/preset/background, with new canvases transparent by default.
- The layer panel top has only group, ungroup, and new-layer icons; delete and one mask toggle stay bottom-right. The mask button highlights when active and toggles off on a second click. Hierarchy changes by drag: row edge reorders, folder center reparents, top-level zone moves out. Show drop targets, preserve world coordinates, and forbid dropping into self/descendants. Double-click renames; groups collapse; Shift selects ranges and Ctrl/Command toggles.
- A downward mask clips upper image/content with the lower closed shape. Single selection uses the adjacent lower sibling, or select two siblings. Support rectangle, ellipse, polygon, star, and closed pen paths with at least three nodes. Create a group with `maskId`, preserve source/path/transforms, edit image and mask separately, and unmask back to independent objects. Hidden mask shapes hide the result. This is vector clipping, not a grayscale brush mask.
- Wheel pans; Ctrl/Command+wheel zooms around the pointer. Space temporarily activates hand; H and middle mouse also pan. Keep shortcut hints at the bottom and a help entry.
- Workspace layout is local and separate from `.posterproj`. Sidebar widths, docking, and view pan do not enter artwork history or dirty the project.

Show style stickers as compact thumbnails rendered from their own objects, retaining color, outline, and transparency; names only assist identification. Ordinary stickers insert independent editable copies. Special stickers/components expose meaningful parameters/content for the selected instance while preserving whole-unit selection and double-click internal editing. The baseline Save selection as sticker action stores only ordinary geometry.

These conventions apply across styles. Reference images change initial artwork, stickers, and generator parameters, not common tool positions. Put dedicated controls in the style area without displacing baseline operations.

The foundation implements these stated behaviors but does not promise a complete clone of Figma or Photoshop. Useful references: [Figma toolbar](https://help.figma.com/hc/en-us/articles/360041064174-Access-design-tools-from-the-toolbar), [Figma selection](https://help.figma.com/hc/en-us/articles/360040449873-Select-layers-and-objects), [Photoshop floating panels](https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/stack-floating-panels.html).

Layer locking blocks canvas selection/transforms and can be explicitly unlocked in properties. Multi-selection defaults to same-level objects; explain required action for cross-level cases. Group transforms preserve child text, paths, and assets.

The foundation uses SVG objects and matrix transforms; bitmaps are only image resources. Text wrapping follows font metrics, so handoff checks font availability. Register embedded fonts from project assets.

PDF uses browser printing with canvas-ratio guidance and instructions to remove headers/footers. Browsers may rasterize filters, so do not promise fully vector PDF. PNG/JPG rasterize the same SVG; JPG fills transparency white.

The first foundation run is blank. The Agent must build the reference-specific initial project and inspect it in the running UI; do not treat the default theme as the user's style.

## Canvas text and font menu

- Double-click inside a text frame, including whitespace, for in-place editing. Support multiline text, Chinese IME, and paste. Ctrl/Command+Enter or outside click commits; Esc cancels; composition events must not be intercepted.
- Eight handles resize a text frame independently along its rotated axes, anchor the opposite side/corner, and reflow text without scaling glyphs, font size, line height, or tracking. Width/height fields behave the same. Shift or Lock frame ratio constrains only the frame. Group/multi-selection scaling also preserves glyph size and reflows via frame dimensions. Font-size controls alone resize glyphs.
- In-place editing respects world transforms and parent locking. Each commit is one undo step; saving during an unfinished edit includes the latest text.
- Group the font menu into Chinese, Latin, and embedded project fonts; retain the current custom font. Offer the baseline common-font choices, detect local availability, and clearly request installation/import for missing fonts. A name list is not bundled font files.
- Every object independently stores ratio preference and expanded fill/crop/stroke/shadow/glow sections in its own `editorState`, including project/draft persistence. Multi-selection uses temporary state. All properties reflect the selected object, and editing preserves focus, Tab order, scroll position, and section expansion.
- Double-click groups to edit inside; dim and block outside content only in the editor. Enter nested groups step by step; Esc/Exit Group returns. Dimming never changes export or object opacity.
- Arrow keys move selected objects by one canvas unit and Shift by ten, independent of zoom and undoable. Inputs keep their own keyboard behavior.
- Context menus include copy, cut, paste, group/ungroup, flips, skew, and perspective. Side-midpoints edit skew; corners edit perspective; Esc leaves transform editing. Preview/export must not show internal mesh seams. Transforms remain editable project data for images and basic shapes rather than flattening to bitmaps.
- Ctrl/Command+C copies selected objects and descendants; V pastes offset, Shift+V in place. Preserve object references, masks, and embedded assets. Text inputs retain normal copy/paste.
