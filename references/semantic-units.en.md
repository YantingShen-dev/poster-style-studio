# Style Features and Editing Units

The goal of reference-image decomposition is to let collaborators continue designing with a few natural actions, not to make every visible edge a separate layer. Identify the structures that carry recognition, then write down what the user will do in the next piece from the series: replace a sentence or image, drag in a decoration, change pattern density, or rearrange internal geometry. Default selection units should follow those actions while their internals remain standard project objects.

| Editing unit | Suitable signal | Default operation | Deeper editing |
| --- | --- | --- | --- |
| Basic object | A shape or text item moved, recolored, or edited on its own | Select and edit directly | Pen nodes, text frames, and other shared tools |
| Ordinary sticker | A reusable figure or graphic mainly resized, recolored, or repositioned | Insert an independent copy from a thumbnail and select it as a whole | Double-click into children; ungroup when needed |
| Special sticker | A reusable structure whose copies each need a few shape parameters | Insert/move as a whole and edit parameters for the current copy | Enter internal paths; detach from generation before free redrawing |
| Information component | A reusable frame plus content, such as a window, terminal, ticket, label, or card | Select, scale, and copy as a whole; edit title, body, image slots, and common appearance directly | Enter the group for buttons, borders, or paths; ordinary text changes should not require hunting for child layers |
| Generative system | Halftones, rays, circuits, or repeated layouts governed by shared rules | Keep one recognizable top-level unit with a few high-value live parameters | Expand internal layers for fine adjustment or convert to ordinary objects |

Sticker and component are not exclusive categories. A frame with title and body slots can appear in the sticker library as a template; once inserted it remains a whole selection and exposes per-instance content properties. Ordinary stickers need only shared transforms. Special stickers must explain how their parameters affect form. Do not split a user-facing whole into many peer-level fragments merely to satisfy the shared model.

## Choose the boundary

For each important style feature, check:

1. **Recognition:** would removing it make the poster stop feeling like the same system? High-recognition features deserve dedicated controls.
2. **Change frequency:** will series work change content, local shape, or the generation rule? Put frequent changes outside and rare detail inside.
3. **Repetition:** does the user copy a complete structure or recombine its parts? Preserve the former as a component and expose the latter as stickers/basic shapes.
4. **Parameter value:** a parameter must clearly change the visual result and have a comprehensible name, range, and default. Do not expose algorithm variables just because they exist.
5. **Fidelity boundary:** unreliable detail may remain raster or fixed outline, but important content slots must not be hidden in bitmaps or fragments.

If two breakdowns are both reasonable and would change the workbench's purpose, briefly describe the everyday workflow for each and ask. With no reply, default high-frequency information containers to whole components with editable slots, repeated subjects to ordinary stickers, and rule-based patterns to parametric systems. Deep path editing is an additional route, not a substitute for semantic operations.

## Implementation and acceptance

Use a `group` as the selection root for complex units and keep children as standard objects. Component slots and special-sticker parameters belong to the **current instance** and must survive save, copy, undo, and reopen; do not use one global `style.params` value for all copies. A practical project convention is pure JSON `styleUnit:{kind,version,params}` on the group root and `styleSlot` such as `title`, `body`, or `image` on replaceable children. Resolve slots within the current group after copying rather than referring to fixed object IDs across instances. The foundation preserves these extra fields, but the dedicated extension must validate them and provide the instance property UI and update transaction. Do not build detached DOM decoration. When regenerating geometry, preserve the root and matchable child IDs, manual transforms, and added content, and state which manual node edits will be replaced.

Important pattern sliders preview during drag and commit one undoable step on release. Heavy work may coalesce by animation frame; users should not need to click Generate after every numeric change. Color, text, and source-image changes use the same preview and export data. Animation preview and frame export share parameters and time sampling.

Before delivery, complete real tasks: copy an information component and change only the second copy's title/body; insert two special stickers and adjust only one; drag a key pattern control and undo it in one step; save and reopen the project and verify both whole-unit and internal editing remain available.
