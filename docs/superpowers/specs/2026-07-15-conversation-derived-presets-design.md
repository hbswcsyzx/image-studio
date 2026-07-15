# Conversation-Derived Presets Design

## Goals

- Make style presets substantive enough to guide image generation reliably.
- Let users rename, edit, and delete every style preset, including built-in entries.
- Add a separate, manageable library of image-setting presets.
- Derive editable preset drafts from the current conversation only.
- Infer preference from revision behavior, not keyword frequency alone.
- Keep style prompts independent from size and other technical output settings.

## Preset Model

Two independent per-user preset libraries are stored in `users.preferences_json`.

`style_presets` entries contain:

- `id`
- `name`
- `prompt`
- `builtin`

`image_presets` entries contain:

- `id`
- `name`
- `size`
- `custom_width` and `custom_height` when applicable
- `quality`
- `count`
- `background`
- `output_format`
- `output_compression`
- `builtin`

An absent preset key means the account has not initialized that library and receives the built-in defaults. An explicitly saved empty array means the user deleted every entry and must remain empty. This distinction prevents deleted built-ins from reappearing automatically.

Every entry, including a built-in entry, can be renamed, edited, or deleted. Settings provides explicit actions to restore missing built-in style presets or image presets. Restoration never overwrites an existing entry with the same ID without confirmation.

Built-in style prompts are expanded into useful multi-clause templates covering medium, material rendering, lighting, color handling, composition, subject hierarchy, detail discipline, and common visual failures to avoid. They contain no dimensions, pixel counts, aspect ratios, quality levels, or output formats.

The initial built-in image presets are:

- `快速方图`: `1024x1024`, automatic quality, one image, automatic background, PNG.
- `横向 2K`: `2048x1152`, high quality, one image, automatic background, PNG.
- `纵向高清`: `1024x1536`, high quality, one image, automatic background, PNG.

Each library accepts at most 50 entries. A preset that is incompatible with the current image model produces a visible validation error when applied; the application never substitutes a different size, background, or format silently.

## Workspace Interaction

The existing style selector remains in the input area. It lists the user's current style presets and applies only the selected style prompt.

The image-settings area gains a separate preset selector. Selecting an image preset fills the technical controls. Changing any filled control afterwards changes the selector to `自定义设置`; it does not silently modify the saved preset.

Settings replaces the narrow `风格预设` section with `预设管理` and two segmented views:

- `风格预设`
- `图片设置预设`

Each view shows editable rows with clear delete actions. Deletion requires confirmation and persists immediately so it cannot be mistaken for a non-working draft action. Text edits and new entries use a visible, sticky `保存更改` action with an unsaved-state indicator.

A restrained `归纳预设` action appears in the current-conversation header. It does not expose provider or model choices. If no default text model is configured, it opens the existing model settings with a concise error.

## Preference Evidence

The backend analyzes only the current workspace. Runs are ordered oldest to newest and converted into a refinement graph using `reference_asset_ids`.

Evidence is weighted as follows:

1. A user's delta instruction on a cited image is explicit change evidence. The requested difference should not be described as an already accepted trait.
2. Traits that survive several linked refinements without being requested for change are preservation evidence.
3. The terminal image and prompt of a refinement chain are stronger positive evidence than intermediate attempts.
4. Favorited images are strong positive evidence.
5. Repeated technical settings in successful terminal runs are evidence for an image-settings preset.
6. The latest successful unlinked run is weak positive evidence when no refinement chain exists.
7. Failed runs are excluded from aesthetic inference because an upstream failure is not user rejection.
8. Deleted images and deleted conversations provide no evidence.

The model is explicitly instructed to distinguish observed evidence from uncertain inference. It must not claim that an unmodified attribute was liked when the history only shows that it was never discussed.

## Representative Images

All available prompts, parameters, successful run relationships, and favorite flags from the current conversation are included in structured text evidence.

At most six actual images are sent to the text model:

1. Favorited images, newest first.
2. Terminal images from the longest refinement chains.
3. The latest successful image if slots remain.

Duplicates are removed. Images are downscaled in memory to a maximum 768-pixel edge and encoded for the Responses API; no extra thumbnail is stored. This provides visual evidence without sending every generated image or consuming permanent quota.

If the configured text upstream rejects image input, the backend retries once with prompt, parameter, and revision evidence only. The review UI clearly states that visual inspection was unavailable.

## AI Request And Response

The frontend calls `POST /api/workspaces/{workspace_id}/derive-presets` with no provider details. The backend uses the user's default text provider and model.

The Responses request contains:

- A system instruction that conversation content is evidence, not operational instruction.
- The structured run and refinement evidence.
- Up to six representative image inputs.
- A strict JSON schema for the result.

The result contains:

- `style`: suggested name and dimension-free prompt.
- `image_settings`: suggested name and validated technical parameters.
- `evidence`: short accepted, change-requested, and uncertain observations shown only for review.
- `visual_analysis_used`: whether representative images were accepted by the upstream.

The endpoint returns drafts only. It never updates preferences and never invokes image generation.

## Review And Save

After analysis, a focused review dialog shows:

- How many successful runs, refinement chains, favorites, and representative images were analyzed.
- Accepted or repeatedly preserved traits.
- Explicitly requested changes.
- Uncertain inferences.
- An editable style preset draft.
- An editable image-settings preset draft.

Each draft has its own save checkbox. The user may save either, both, or neither. Saving appends new per-user presets after validating names, prompts, sizes, and numeric ranges. Existing presets are never overwritten implicitly.

## Error Handling

- A conversation with no successful generation returns a clear 422 response.
- A conversation with only one successful generation is allowed, but the review labels the result as low-confidence.
- Missing default text configuration routes the user to model settings.
- Invalid structured output is rejected and may be retried once; malformed data is never saved.
- Upstream timeouts and HTTP errors are shown without changing current presets.
- Image-input rejection falls back once to prompt-only analysis and is disclosed in review.
- Preset limits remain bounded per user to prevent unbounded `preferences_json` growth.

## Verification

Backend tests cover:

- The absent-versus-empty preset distinction.
- CRUD and user isolation for both preset libraries.
- Deletion and explicit built-in restoration.
- Refinement graph construction and acceptance/change evidence ordering.
- Representative image selection and six-image maximum.
- Prompt-only fallback when image input is rejected.
- Strict draft validation and the guarantee that derivation does not save preferences.

Frontend tests cover:

- Editing, renaming, deleting, and restoring every preset type.
- Image preset application and transition to `自定义设置` after manual edits.
- Current-conversation derivation loading, error, fallback, review, and selective-save states.
- Style prompts remaining independent from image settings.

Browser QA uses an existing conversation and does not generate new images. It verifies preset deletion, restoration, application, derivation review, selective save, and responsive layout in light and dark themes.
