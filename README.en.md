# poster-style-studio · Poster Style Studio

[中文](README.md) | [English](README.en.md)

**Give it a poster you like. Get a real web workbench that stays editable, saves complete projects, and can be handed to another collaborator.**

This Skill helps an Agent analyze the visual language of a reference poster, confirm choices that affect reconstruction, and generate a dedicated `index.html`, an initial `.posterproj`, a preview, and a deployable `site/` directory at the location chosen by the user. It first decides the right editing unit for each key style feature, then uses ordinary stickers, per-instance parametric stickers, content-editable components, or live generative patterns. Every style shares the same editor foundation.

![CoDay geometric poster workbench](docs/images/coday-geometric-workbench.png)

## Three styles, one editor foundation

These workbenches were previously built with the Skill. They illustrate visual directions; they do not imply that the latest semantic editing-unit design has been backported to those older projects. The repository includes showcase screenshots only, not full event projects or source assets.

| CoDay · Geometric | Herstory · Halftone | Practice Sharing · Pixel |
| --- | --- | --- |
| <img src="docs/images/coday-geometric-workbench.png" alt="CoDay geometric poster workbench" width="380"> | <img src="docs/images/herstory-halftone-workbench.png" alt="Herstory halftone poster workbench" width="380"> | <img src="docs/images/pixel-workbench.png" alt="Pixel poster workbench" width="380"> |
| Reusable vector blocks whose colors and structures can be recombined. | Halftone and circuit forms retain dedicated parameters and layers, with room for animation. | Pixel lettering, windows, and character stickers live in the same project model. |

The editor still provides general selection, transforms, layers, pen paths, text, fills, strokes, and effects:

![Object properties and multi-stop gradients](docs/images/editor-controls.png)

## From one reference to a complete family of materials

The workbench is not limited to reproducing a single poster. It turns palette, lettering, texture, composition, and signature graphics into editable, recombinable objects. In these real derivatives, content, people, and aspect ratio change while the visual language remains coherent.

### CoDay: geometric blocks across aspect ratios

| Portrait key visual | 16:9 landscape derivative |
| --- | --- |
| <img src="docs/images/case-coday-reference.jpg" alt="CoDay portrait geometric key visual" width="300"> | <img src="docs/images/case-coday-landscape.jpg" alt="CoDay 16:9 landscape derivative" width="560"> |

Circles, arches, cutouts, and blocks remain recombinable units. The landscape version is a new composition rather than a crop, preserving the palette and paper grain while redistributing the title and graphic weight.

### Herstory: from one event poster to a complete identity system

| Style starting point | Event-poster series |
| --- | --- |
| <img src="docs/images/case-herstory-reference.jpg" alt="Herstory halftone style starting point" width="300"> | <img src="docs/images/case-herstory-poster-series.jpg" alt="Herstory event-poster series" width="520"> |

| Brand page, certificate, and large-format graphics | Front/back badges and role variants |
| --- | --- |
| <img src="docs/images/case-herstory-brand-system.jpg" alt="Herstory brand page, certificate, and event graphics" width="520"> | <img src="docs/images/case-herstory-badges.jpg" alt="Herstory front and back event badges" width="520"> |

The same magenta, black, and white palette, portrait halftone, circuitry, and code marks can be regenerated and rearranged for different guests, topics, and formats. These examples cover talk posters, a web page, a key visual, a certificate, and participant/organizer badges. This is a visual system that can keep growing, not a single locked template.

### Pixel meetup: from portrait poster to venue screen

| Portrait poster | 16:9 venue-screen derivative |
| --- | --- |
| <img src="docs/images/case-pixel-reference.jpg" alt="Pixel meetup portrait poster" width="300"> | <img src="docs/images/case-pixel-landscape.jpg" alt="Pixel meetup 16:9 venue screen" width="560"> |

Windows, terminals, characters, and pixel headlines can be rearranged separately. Older workbenches represented each window with multiple layers; the current workflow first decides whether it should instead be a content-editable component. In landscape format, information hierarchy, overlap, and character movement can all be reorganized.

Together these cases demonstrate four kinds of control:

- **Style control:** keep a coherent palette, texture, halftone, pixel, or geometric language.
- **Content replacement:** change titles, guests, event details, and images without rebuilding the visual system.
- **Layout recomposition:** adapt the same objects to portrait posters, landscape screens, badges, and large-format materials.
- **Project handoff:** preserve objects, layers, and parameters in `.posterproj` so another collaborator can continue editing.

## Installation

The Agent needs local image/file access, Python 3.10+, and Node.js 18+. Generated workbenches need only a modern desktop browser and work offline.

```sh
git clone https://github.com/YantingShen-dev/poster-style-studio.git ~/.codex/skills/poster-style-studio
```

On Windows PowerShell:

```powershell
git clone https://github.com/YantingShen-dev/poster-style-studio.git "$env:USERPROFILE\.codex\skills\poster-style-studio"
```

Keep the relative locations of `SKILL.md`, `assets/`, `references/`, and `scripts/`. Then give the Agent a reference poster and prompt:

> Use $poster-style-studio to turn this poster into an editable web workbench. Confirm the save location first, then generate the web page, initial project, and preview.

## Workflow

1. **Read and discuss:** identify the main style structures and common future edits; choose stickers, components, or a generative system as editing units; ask only about choices that change implementation.
2. **Generate the dedicated workbench:** use `assets/editor/` as the foundation and place style objects, parameters, and stickers in the shared project model.
3. **Edit and hand off:** manage layers, draw paths, edit text and effects, save a `.posterproj`, and let another collaborator reopen it.
4. **Export and deploy:** export PNG, JPG, SVG, or browser-printed PDF; upload `site/index.html` to static hosting. Static hosting is not real-time multiplayer editing, so collaboration still uses project files.

The foundation includes nested layers and masks, canvas zoom and alignment, editable path nodes, image cropping, solid/multi-stop gradient/pattern fills, strokes, shadows, glows, and common blend modes. Stickers appear as thumbnail cards and insert editable copies. Locked decorative overlays or objects marked `hitTest:false` do not block editable objects below them.

## Direct the design live with Codex

Generated workbenches include `live_design.cjs`. Run `node live_design.cjs serve /absolute/path/to/workbench`, open the URL it prints, and Codex can inspect the current project, edit objects and style parameters, change the canvas, and show the result immediately. Changes enter the editor's undo history, so a person and Codex can take turns editing. The page itself does not embed an Agent and continues to work offline or on static hosting after the service stops. See [Live design interface](references/live-design.en.md).

## Local build and validation

```sh
python scripts/build_editor.py --output /absolute/path/my-editor
node --test tests/*.test.cjs
python scripts/check_package.py
```

`--output` must be empty. That first command creates only the blank foundation. A reference task must also create an initialized project and build with `--project /absolute/path/initial.posterproj`. Package customized source with `--source /absolute/path/source`. See [SKILL.en.md](SKILL.en.md) and [Project format](references/project-format.en.md).

## Boundaries and license

A reference bitmap does not automatically become exact vector geometry; complex textures may remain embedded bitmaps. Cross-device handoff must verify that fonts are available or embedded. Images embedded in SVG remain raster. PDF export relies on browser printing.

Code is released under the [MIT License](LICENSE). Showcase screenshots demonstrate workbench interfaces; they are not distributed as poster templates or complete project files.
