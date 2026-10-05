# Project Format and Handoff

## Format

The foundation uses one UTF-8 JSON file with extension `.posterproj`, `format: "poster-style-studio"`, and current `version: 2`. Assets are embedded as data URLs, so the file is offline and self-contained. v1 loads with automatic migration and saves as v2. Older tools reject v2; hand off the current tool with the project so masks and newer data are not silently lost.

Root fields: `format, version, id, name, canvas, objects, assets, fonts, style, animation, savedAt`.

- `canvas`: `width,height,background`; transparency is `transparent`.
- `objects`: back-to-front order, with sibling order controlling stacking. Every object stores `id,type,name,parentId,m,visible,locked,hitTest,opacity,fill,fillPaint,stroke,strokeWidth,blendMode,shadow,glow`. Matrix `m=[a,b,c,d,e,f]` maps local to parent. Types are `rect,ellipse,line,polygon,star,path,text,image,group`. Missing legacy paint/blend fields become solid/normal.
- `hitTest` defaults to `true`. `false` objects remain layer-selectable/editable but do not block canvas hits. Locked objects and descendants of locked groups also do not receive pointer hits. Full-canvas decoration should use `locked:true, hitTest:false`.
- `fillPaint`: `{type,gradient,pattern}` with type `solid,gradient,pattern`. Gradient is `{kind,angle,reverse,from,to,stops}` and at least two `{id,position,color}` stops (`position` 0–1); kinds are `linear,radial,conic`. Pattern is `{assetId,scale,rotation,size}` using an embedded PNG/JPEG. `fill:'none'` pauses rendering but retains settings. Blend modes: `normal,multiply,screen,overlay,plus-lighter,plus-darker`.
- Geometry stores `w,h`; paths store `nodes` (`x,y,inX,inY,outX,outY`) and `closed`; text stores `text,fontFamily,fontSize,fontWeight,fontStyle,letterSpacing,lineHeight,textAlign`, with `w,h` as frame size.
- Optional `warp={box,points}` stores an editable four-corner perspective; ordinary skew stays in `m`. Image strokes apply to visible pixel edges.
- Optional `editorState={keepRatio,sections}` stores per-object ratio preference and expanded `fill,crop,stroke,shadow,glow` sections. It persists, deep-copies, and remains independent; temporary multi-selection state does not overwrite objects.
- Layer folders are `group` objects with `parentId`. A clipping group also stores `maskId` pointing to one direct closed-shape child, used as a clip path but not painted. Copy remaps references; unmask retains children. Never leave dangling mask references.
- Images store `assetId` and normalized source crop `{x,y,w,h}`. Resources contain actual data and MIME, not local file paths.
- `assets` maps IDs to `{id,mime,data,name}`. Images support PNG/JPEG/WebP; fonts support TTF/OTF/WOFF/WOFF2. Imported SVG must be safely sanitized or rasterized before use.
- `fonts` is an array of `{family,assetId,weight,style}`. List system fonts that cannot be embedded in delivery notes.
- `style` is `{id,version,modules,params,palette,stickers,gradientPresets?}`; module entries are `{id,version}`. System parameters belong in `style.params`, not per-copy state. Ordinary stickers store `{name,objects}` and receive new IDs on insertion. Parametric stickers/components may store pure JSON `styleUnit` on the root and `styleSlot` on children; the dedicated extension validates and edits them. User gradient templates live in `gradientPresets`.
- `animation` is `{enabled,duration,fps,amplitude,objectIds}`. Baseline breathing scales whole objects. Style-specific dot-radius or line-growth animation requires a dedicated module.

Create defaults with `PosterCore.createProject()` and `PosterCore.createObject(type, overrides)`. Validate the complete project with `validateProject`; do not bypass it.

## Integrity and versions

Validate version, unique IDs, types, parent cycles, finite numbers, invertible matrices, resource/font references, image formats, and animation objects before replacing the current project. Reject unsupported versions explicitly rather than truncating unknown data and resaving.

Projects store editable state but not history by default; opening starts a new history. Preserve hidden objects and assets. Unused assets may remain after deletion for undo and sticker references; do not remove still-referenced data.

Files contain data only. Extension logic is registered in the delivered tool and must never load JavaScript or remote modules from a project. Generators store seed, parameters, stable object IDs, and current geometry. Without the module, preserve basic editable geometry and show a degraded-mode warning.

## Delivery and recovery

At minimum, local handoff includes root `index.html` plus `.posterproj`. `site/index.html` is the static-hosting entry and embeds the initial project/assets. Once both collaborators have a compatible tool, they can exchange only projects. Saving a project does not save new program code; after modifying a style module, redistribute the tool. Static hosting does not synchronize projects live.

Prefer user-provided redistributable embedded fonts. If a font cannot be guaranteed on another machine, list it. Show missing-font warnings and never silently rewrite a project when the user chooses a fallback.

Test in a clean browser context with no draft: verify layer tree, matrices, text, curve handles, crop, effects, and parameters; edit text and nodes, save, reopen, and confirm both visual fidelity and continued editability.
