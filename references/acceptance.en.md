# Acceptance

## Verify tangible deliverables first

In the user's chosen directory confirm `index.html`, `site/index.html`, `initial.posterproj`, a preview, and instructions. `site/index.html` must contain the same full editor and initial project without absolute local paths or external scripts/styles. Open the generated page and confirm it is not a blank foundation. Modify one object, save, and reopen in a clean environment. PNG/SVG alone, snippets, deployment advice, or analysis are not a completed web workbench.

Serve `site/` locally to test initial artwork, editing, and project export/import without `source/` or disk paths. If no hosting provider was requested, prepare the directory but do not publish. Static hosting lets many people access the page; it is not live co-editing without a separate sync service.

## Primary test: handoff

Save the full project. In a clean environment edit text, move a group, change a pen handle, replace an image, and save; reopen it in the original environment. Compare data, artwork, typography, and assets, including effects, hidden layers, fonts, crop, and style parameters.

Corrupt projects, unknown versions, missing resources, and cyclic groups must fail without replacing current work. Make degraded mode or font substitution visible and do not claim full restoration.

## Baseline interactions

Exercise at least once: multi-select/lock/order/group; canvas zoom/pan; snapping; align/distribute; canvas ratio change without stretching; text wrapping/styles; straight/curve path creation and node/handle editing; fill/stroke/opacity/effects; undo/redo; image crop and embedding.

Verify outcomes, not button presence. Properties update immediately; mouse handles do not conflict with canvas dragging. Projects/exports exclude selections, guides, and node markers.

For layers/masks, test internal dragging of hollow geometry and open paths; contained versus touch selection in both directions; usable rotation/resize handles; panel group/ungroup/delete; nested layers and cross-parent movement without position jumps. Use a real decodable image and closed path for a mask, edit image position and mask nodes separately, repeatedly toggle the same mask button, and verify highlight, undo, persistence, PNG, and SVG crop. Mask child visibility, locking, and copied references remain valid.

Test divider dragging and keyboard resize; floating/docking/resizing the layer panel; restore view and canvas dialog; layer reorder/collapse/rename; drag-to-create shapes; eight-way resize; Shift overlap selection; hand/temporary Space; wheel pan and Ctrl-wheel pointer zoom. Panel operations must not alter artwork; selections contain no duplicates; hidden/locked objects are not marquee-selected.

## Style and generation

Compare the real reference for signature features, hierarchy, subject, type, and whitespace. Verify that key style structures use appropriate editing units rather than equating layer count or single-image fidelity with usability. Complete one real series-edit task from [Style features and editing units](semantic-units.en.md#implementation-and-acceptance): copy and refill an information component; insert two special stickers and adjust only one; drag a key generator parameter with live preview and one-step undo. If those structures do not exist, test the most important real edit for that poster instead of inventing components. Replace content again and confirm the system still produces more work. Parameter changes preserve user-added objects; density/seed changes undo and restore. State image-extraction limits rather than inventing results.

## Output

Open PNG/JPG/SVG and check ratio, fonts, crop, transparency, and filters. SVG should contain real geometry/text while images remain images. Check browser print settings for PDF; if the system print dialog was not actually used, mark PDF untested. State format-specific font/filter limits.

For animation, verify selected frame equals still export, frame count is correct, and identical time/seed reproduces the same result.

## Report

State the tested environment, passed items, untested items, and concrete limits. Automated tests do not equal a full browser workflow. Deliver the initialized project, single-file tool, preview, and short instructions, not only a feature list.

Text acceptance: create and type immediately; edit existing text in place by double-clicking whitespace; test multiline Chinese input, outside-click commit, Esc cancel, per-edit undo/redo, rotated/group text, parent lock, and saving mid-edit. Enter/Esc during IME composition must not finish editing. Verify Chinese/Latin font groups, current and embedded fonts, visible canvas changes, and explicit missing-font warnings.

Text-frame acceptance: drag every side/corner. Text reflows while font size, shape, leading, and tracking remain unchanged; opposite anchors stay fixed and width/height are independent. After rotation/group transforms, resizing follows frame axes. Property width/height and multi/group scaling also do not scale glyphs; font size still does. Verify undo and reopened layout.

Property-panel regression: expand and enable shadow, change values, and preserve expansion, focus, Tab order, and scroll. Disable keep-ratio and change width repeatedly without changing height. Preferences survive reselection/refresh. Enter nested groups stepwise; outside dimming never saves/exports. Arrow movement uses 1 unit or Shift 10 and is undoable.

Instance independence: place same-type A and B; give A different ratio, expanded/enabled effects, color, and opacity while B stays distinct. Switch repeatedly, resize, duplicate and edit separately, undo, multi-select then single-select, save/reopen, and confirm independence. Temporary multi-select state must not overwrite objects.

Test expressive headlines against [Expressive type acceptance](expressive-type.en.md#acceptance): low/mid/high parameters, replacement text and character coverage, independent instances, and handoff. For outline + font fallback, verify switching and that both versions retain their own content.
