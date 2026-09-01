# Canonical art canonical-v1 final audit

The runtime is activated on one approved canonical-v1 PNG path per active part. Legacy batches remain on disk and are recorded as deprecated.

## Scope

- Active part IDs: 114
- Active individual PNGs: 114
- Active sprite cells: 0
- Deprecated legacy mappings: 133
- Status: PASS 114

## Runtime-source finding

All gameplay, recoloring, garage previews and mission scenes read the same pre-aligned 512×512 RGBA canonical files. No CSS perspective, skew or non-uniform correction is used.

## Review policy

Automated checks verify source existence, alpha bounds, edge contact, likely green residue and 512×512 RGBA output. Camera angle, top-face visibility, lighting and material style are accepted only from the explicit review records in canonical-v1-approvals.json.

## REGENERATE (0)

- None
