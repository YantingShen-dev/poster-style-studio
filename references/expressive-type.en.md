# Expressive Type: Parameterize First, Then Fall Back to Outlines

Read this when a reference headline uses distinct pixel, soft, geometric, modular, or other custom letterforms. Ordinary body text remains editable text. First determine whether rules can generate the form; do not trace it or choose a vaguely similar font merely because the exact font name is unknown.

## Evaluate and prototype

Study strokes, corners, terminals, weight, counters, joins, baseline, and repeated structures, separating letter construction from surface texture. Choose a technique that explains the reference, then prototype representative original characters and replacement text. Defaults should resemble the source, and replacement text should retain the same construction logic.

| Observed feature | Candidate method | Meaningful controls |
| --- | --- | --- |
| Pixel, dot-matrix, stepped edge | Sample a base glyph outline/mask on a grid and create vector squares or dots; use coverage threshold or outline offset for weight | Pixel/grain size, spacing, dot shape, stroke weight; keep font size separate |
| Soft, rounded, inflated, fused | Start from a suitable skeleton/outline; apply rounding, smoothing, dilation/erosion, or a distance-field threshold and extract contours | Softness, roundness, inflation, connection; expose only controls that match the source |
| Modular, cut, assembled | Build glyphs from repeated parts and stroke rules, or make controlled cuts/replacements in a base outline | Module size, notch size, join width, slant |
| Bent, wavy, elastic | Apply continuous deformation to an outline/skeleton and output exportable geometry | Bend, amplitude, rhythm; preserve the seed for randomness |

Soft does not mean a blur filter; pixelated does not mean reducing the resolution of the whole poster. Controls must visibly drive understandable glyph changes. Record concrete failure modes such as closed counters, fused strokes, damaged detail, or inability to generate replacement text instead of claiming an untried method is impossible.

Prefer a suitable real font as the text input and glyph-coverage base, then transform its structure. Modular lettering can use explicit character rules. Rebuilding a few source characters is not an arbitrary-text font. State supported characters, show a clear fallback for unsupported ones, and never infer full Chinese coverage from a handful of source glyphs.

## Communication and controls

Propose an evidence-based route, then ask only choices that affect use, such as whether Chinese headline replacement is required or how widely grain should vary. If parameterization is already requested, implement it. The Agent chooses the technical method rather than asking the user to choose an algorithm. Pixel/soft controls are conditional and should not be added to every style.

Provide source-text input, necessary form controls, and a way back to the reference defaults. Use design-language labels and useful ranges/steps. Font size controls text size; form parameters control construction; resizing the text frame changes only layout. Each expressive headline owns independent text, parameters, and panel state unless the user explicitly links them.

## Project implementation and handoff

Integrate the real generator through [Style extensions](style-extension.en.md). The foundation has no universal custom-type algorithm; instructions or inert sliders are not implementation.

Preserve the source string, base font resource/character rules, font size and layout, form parameters, seed, module version, and generated vector outlines. Give every headline an instance ID, for example under `style.params[moduleId].instances[instanceId]`, with stable `generatorKey` links. Do not share one mutable parameter set between headlines.

Prefer standard path/geometry objects. A temporary bitmap may help grid sampling, but final glyphs should be grouped or merged rather than exposing thousands of grains as top-level layers. Save actual font resources, not only names. Regeneration updates only that headline and preserves layout, other headlines, and user objects; one parameter change is one undo step. When node editing conflicts with regeneration, provide an explicit Convert to static outlines action instead of silently overwriting edits.

Preview, static export, and reopen use the same parameters and geometry, not temporary CSS. Without the generator module, stored outlines still display and remain basically editable, but the UI must say text regeneration is unavailable.

## Dual-version fallback

Only when a prototype cannot satisfy source character, readability, and required replacement coverage together, provide both:

1. **Original-outline version:** Bézier paths faithfully reproduce the source characters, counters, curves, placement, and spacing. These fixed vectors can move, recolor, and edit nodes, but cannot accept arbitrary text and must not be called a font.
2. **Editable-font version:** real text using a similar font with the required character coverage. Prefer an embeddable TTF/OTF, or supported WOFF/WOFF2. This means a font file, not a TIFF bitmap. If it cannot be provided, state the missing resource instead of listing a name and claiming delivery.

Keep both versions, labeled Original outline and Editable text. Switching visibility does not overwrite edits in the other version. Save the choice and font resources. If parameterization works, this dual version is not mandatory.

## Acceptance

- Compare defaults with the source, then test low/mid/high parameter values for real change, healthy counters/strokes, and readability.
- Replace text with supported content of different lengths, cases, and required Chinese characters; unsupported characters give clear feedback.
- Place two headlines and change only one; verify undo, font-size, and frame-size behavior.
- Save and reopen cleanly, then continue editing; verify resources, parameters, outlines, PNG, and SVG.
- For a dual fallback, verify faithful outlines, editable font text, switching, and persistence; never describe static outlines as arbitrary-character generation.
