# Studio Visual Polish Design

## Direction

Use the approved "Studio Neutral" direction: cool neutral surfaces, graphite text, and a restrained teal accent reserved for primary actions, focus, and active states. Light and dark themes keep the same hierarchy without reducing generated-image contrast.

## Workspace Changes

- Remove the image quota counter from the top bar so the current image and creation controls remain the primary focus.
- Show image and conversation usage in Settings > Overview with compact progress indicators and exact values.
- Render generation history chronologically from oldest at the top to newest at the bottom. Keep the newest generated asset selected by default.
- Keep the session drawer in reverse chronological order, with the newest conversation first.

## Motion

- Use 160-220 ms transitions for buttons, fields, menus, thumbnails, drawers, and image changes.
- Animate drawers and modal surfaces with short opacity and transform transitions.
- Give the generation overlay a single restrained shimmer/progress treatment while preserving its existing elapsed-time feedback.
- Disable non-essential motion under `prefers-reduced-motion: reduce`.

## Visual System

- Light theme: pale cool-gray canvas, white working surfaces, blue-gray borders, graphite text, deep teal primary action.
- Dark theme: neutral charcoal canvas and surfaces, cool-gray borders, light text, brighter teal primary action.
- Preserve red for destructive actions and amber for warnings so the interface is not a one-hue palette.
- Keep controls compact and cards at no more than 6px radius.

## Verification

- Component tests verify the top bar no longer exposes image quota, Settings Overview shows both quotas, and the generation timeline renders oldest-to-newest.
- Existing authentication, upload-thumbnail, and model-setting tests must remain green.
- Production browser QA verifies both themes, timeline ordering, quota location, responsive layout, and reduced visual jank during common interactions.
