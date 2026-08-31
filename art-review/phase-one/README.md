# Canonical art phase-one audit

This is an audit-only checkpoint. No file under `public/assets` was replaced, no runtime mapping was changed, and no perspective was hidden with CSS transforms.

## Scope

- Active part IDs: 114
- Individual PNG overrides: 21
- Active sprite cells: 93
- Deprecated/overridden mappings: 19
- Status: ALIGN_ONLY 89, REGENERATE 25

## Runtime-source finding

`PART_IMAGE_ASSETS` wins over `SPRITES` in both `spriteStyle` and `RecoloredPartArt`. Individual PNGs are centered with contain while atlas cells use 4x4 background positioning, so the active app currently has two alignment paths. The first phase only records this inconsistency.

## Automated checks

The scripts verify source existence, alpha bounds, edge contact, likely green residue, 512x512 RGBA review output, and the 0.97-1.03 alpha-bound ratio for standalone wheels. These checks cannot reliably judge camera angle, top-face visibility, lighting direction or material style.

## Human-review policy

No resource is automatically marked PASS. ALIGN_ONLY means technical extraction is clean but a person must approve its facing, projection, lighting, material and mount geometry. REGENERATE is reserved for a visible baked-view/style/structure problem or a failed technical check.

## REGENERATE (25)

- `excavatorchassis` (v9-workshop-chassis.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: the large turntable top surface is visibly exposed and cannot be corrected by anchor alignment.
- `hoverframe` (transport-hoverframe-v11.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: v11 outline, shading and detail density do not match the v9 main batch.
- `airframe` (transport-airframe-v11.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: v11 outline, shading and detail density do not match the v9 main batch.
- `gliderframe` (transport-gliderframe-v11.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: v11 outline, shading and detail density do not match the v9 main batch.
- `pontoonframe` (transport-pontoonframe-v13.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: v13 outline, shading and detail density do not match the v9 main batch.
- `hoverbody` (transport-hoverbody-v11.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: the fan/end face and v11 material style are incompatible with the v9 body set.
- `airbody` (transport-airbody-v11.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: the nose points left and the v11 material style is incompatible with the right-facing v9 set.
- `gliderpod` (transport-gliderpod-v11.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: v11 material, outline and detail density are incompatible with the v9 body set.
- `seaplanebody` (transport-seaplanebody-v13.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: the nose points left and the v13 material style is incompatible with the right-facing v9 set.
- `greentrack` (movement-greentrack-v13.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: the v13 olive recolor, highlights and contour treatment are inconsistent with the v9 movement set.
- `rollerwheel` (v10-side-special-movement.png): Visible pixels touch the source-cell edge; crop or atlas bleed requires review.
- `ski` (movement-ski-v13.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: one asset contains two complete skis and its v13 style does not match the v9 movement set.
- `hover` (movement-hover-v13.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: the v13 glossy hover assembly has incompatible contour and material treatment.
- `hovercraftskirt` (transport-hovercraftskirt-v11.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: the top plate and rounded skirt depth are visibly perspective-baked.
- `wing` (transport-wing-v11.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: the large top surface is visible and cannot be corrected by alignment.
- `paraglider` (transport-paraglider-v11.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: the canopy is perspective-baked and does not share the orthographic side view.
- `propeller` (transport-propeller-v11.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: the hub and blades are presented from the front/three-quarter view rather than strict side projection.
- `hovercab` (transport-hovercab-v11.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: v11 outline and glossy bubble treatment do not match the v9 cab set.
- `pilotcab` (transport-pilotcab-v11.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: the cabin points left and shows a large nose/end face.
- `gliderseat` (transport-gliderseat-v11.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: this is a perspective seat rather than a strict side-view cab module.
- `bubblecockpit` (transport-bubblecockpit-v11.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: v11 outline and glossy bubble treatment do not match the v9 cab set.
- `shovel` (v9-workshop-tools.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: the bucket interior/front plane is prominent and perspective-baked.
- `fork` (v9-workshop-tools.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: both fork tines and mast depth are visible, creating a three-quarter view.
- `plow` (v9-workshop-tools.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: three staggered moldboards encode depth and cannot read as strict side projection.
- `mixer` (v9-workshop-tools.png): Technical extraction is clean; projection, facing, lighting and style still require human review before PASS. Human review: the drum end face and elliptical bands expose a baked perspective view.

## Deliverables

- `active-assets.json` and `code-path-audit.json`
- 114 independent 512x512 RGBA review PNGs under `active-parts/`
- Six category contact sheets with anchors and status overlays
- One 10-build cross-batch regression sheet
- `deprecated-assets.json` and per-resource `regenerate-prompts.json`

## Stop gate

Choose the gold-standard assets and approve or amend `manual-overrides.json` before phase two. `art:normalize` and `art:pack` intentionally stop while `approvedVersion` is null.
