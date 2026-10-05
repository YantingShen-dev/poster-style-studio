# Reading the Image and Asking What Matters

## Observe before proposing the tool

Record canvas ratio; headline, body, and secondary-information hierarchy; palette; type forms; graphic grammar; subject/background relationship; repeated objects; texture; and spatial density. Separate observed facts, inferences, and missing user input. Do not invent unclear dates, names, or important event details.

Explain the 3–5 most valuable features to preserve, which structures carry recognition, and which content will change. Make a short editing-unit list with a name, proposed ordinary sticker/special sticker/information component/generative-system form, default selection and modification behavior, reuse, and reconstruction confidence. This is build input, not a technical form for the user. See [Style features and editing units](semantic-units.en.md).

Keep text editable; use vectors for rule-based geometry, paths for curves, generators for repeated patterns, and embedded images for photos or complex texture when needed. Occluded content cannot simply be extracted; redraw it or ask.

## Trigger checks

| Signal | Useful question | Impact |
| --- | --- | --- |
| Repeated characters/icons/objects | Should these become reusable stickers? Recommend preserving the existing set. | Asset library and instances; new poses require another decision |
| Refillable frame, window, terminal, or card | Should users select the whole item and edit its title/body, or freely recombine border parts? Recommend a whole component with slots. | Outer properties and internal granularity |
| Repeated image with a few important shape variations | Which parameters should each copy control independently? Recommend a special sticker. | Parameters belong to instances, not all copies |
| Halftone, wave, or radial structure | Add animation and frame export, or keep it static? | Animation module; a still cannot prove the original motion |
| Replaceable theme photo | Will later posters replace the photo while keeping the treatment? | Parametric treatment or fixed asset |
| Pixel, soft, or otherwise expressive headline | Follow the [expressive type flow](expressive-type.en.md), then ask about required character coverage and useful shape controls. If parameterization fails, explain the outline + similar-font fallback. | Prefer an editable generator; dual versions are fallback |
| Complex central image | Which parts must remain separately editable? Recommend preserving the complex image while separating text and geometry. | Reconstruction granularity and fidelity boundary |
| Unclear series use | Will later work mainly change event details, theme assets, or aspect ratios? | Initial presets and layouts |

This is a required post-inspection trigger check, not an optional suggestion. In particular, ask about priorities for unusual type and about motion/frame export when repeated structures or animation are present. Combine related signals into at most three questions. Do not re-ask known information or invent questions when no signal exists. While waiting, build the independent foundation. After a reasonable interval, state a reversible default and how to change it; a static reconstruction is not evidence that the user rejected animation.

## Turn judgment into an interface

Expose design concepts such as Add sticker, Halftone density, Headline form, and Window body, not rendering APIs or node encodings. Show necessary controls to ordinary users and fold advanced appearance/node editing without omitting it. Key style features should appear as the right whole units rather than being forced into top-level paths or flattened images.

Changing canvas size does not stretch objects by default. Make whole-artwork scaling or reflow explicit.

Asset libraries, animation, and dedicated graphics must work with common layers, selection, history, and project saving. Parameter changes preserve user-added text, objects, and reasonable manual layout.
