# Style Extensions

Extension source lives in `assets/editor/style.js`. The base distribution contains no poster-specific style. Put project-specific code in that file inside the generated source and rebuild with `--source`; do not hard-code a reference image into the shared model.

Register `{id,version,label,controls,generate}` in `window.PosterStyleModules`. Controls are data fields with `key,label,type,min,max,step,options,default`; types include number, range, color, select, checkbox, and text, with optional text `maxLength`. A module may declare `updateMode:'live'` so sliders preview during drag and commit one undo step on release; otherwise keep Generate/Update. Coalesce complex work by animation frame. `generate({project,params,seed})` returns standard objects built with `PosterCore.createObject`, each with a stable `generatorKey`. Instances enter `project.objects` and support common layers, transforms, appearance, effects, selection, movement, save, and export. Parameters only change generator inputs; do not create editor-external layers or floating DOM. Modules do not manage history or downloads directly.

The editor loads registered modules and updates parameters through one validated transaction. Preserve user-added objects. Reuse IDs and manual transforms for matching `generatorKey` objects while updating generated geometry. Use the provided seed for deterministic randomness, not the current time.

A complex panel may extend `editor.js`, but it must use project data and common transactions. `style.params` suits system-wide settings. When one design has multiple independently adjustable special stickers or information components, save parameters and content/image slots on each instance root rather than sharing module state. Selecting the root exposes high-frequency slots/controls; double-click enters internal paths. Updating one instance must not affect others. Store source photos in assets, not closures. A new special object type must implement validation, history, rendering, export, recovery, and module-version handling; prefer standard vectors.

Choose expressive headline generation through [Expressive type](expressive-type.en.md). Each headline keeps independent text, parameters, resources, and instance identity. Regeneration preserves `editorState` so ratio and property-section preferences do not reset.

Ordinary stickers live in `style.stickers` as object groups and may reuse project assets. The sidebar generates recognizable SVG thumbnails from sticker objects. Saving a sticker must preserve visible form, not only a name. A parametric sticker may appear in the same library but must retain instance identity and a dedicated property UI after insertion, rather than flattening into unchangeable paths. Information components with content slots may also be inserted as cards; copied instances keep independent content. The foundation's Save selection as sticker action copies only ordinary geometry, so parametric stickers/components require dedicated instance data, UI, and persistence logic. Mark full-canvas texture overlays `locked:true, hitTest:false`. State whether sticker art was cropped, redrawn, or regenerated when uncertain.

## Optional animation

Enable `animation.enabled` only when the user chooses animation. The baseline breathing module applies periodic scaling to selected objects and offers amplitude, duration, frame rate, pause, scrub, and PNG-sequence ZIP. If the user requests pulsing halftone dots or growing circuit lines, implement the corresponding module and deterministic sampling; do not substitute whole-group scaling without disclosure.

Preview and export share time. Export at `t=i/fps` for `i=0...round(duration*fps)-1`, without repeating the first frame at the end. Wait for rendering before sampling the next frame; include order and parameters in the ZIP. Limit size and total frames and show an estimate to avoid unannounced memory exhaustion.

If a matching module is missing, preserve stored geometry and show a warning. Do not expose a fake Generate button that clears content. Compatibility depends on tool-module versions; a project file does not download modules automatically.
