# Studio Basil UX Redesign

## Goal

Make image creation the only primary workflow. Provider and model details are configured once, saved as user defaults, and hidden during normal creation.

## Experience

- Authentication uses plain explanatory text with only the action words rendered as underlined links.
- New users see a short layout tour, then configure one or more OpenAI-compatible channels and choose a default image model and text model.
- The main workspace is an output canvas with a vertical run timeline and a bottom control dock split into input, image settings, and generation action.
- Reference images render as thumbnails. Prompt polishing and style presets stay in the input section.
- Generation shows an overlay, elapsed time, and an explicit reference-image mode. Errors remain visible and retryable.
- Provider and model controls live in Settings, not in the normal creation dock.

## Settings

Settings has Overview, Models, Profile, and an admin-only System section. Overview shows configured channels and current defaults. Models manages channels, discovers models, classifies image/text candidates, and selects defaults. Profile edits username, email, and password. System stores SMTP configuration for administrators.

## History And Storage

- Each user may keep 100 conversations and 1,000 generated images.
- Conversations can be renamed, favorited, or deleted.
- Images can be favorited and browsed in a gallery with their original prompt.
- The output timeline contains successful and failed runs. Selecting a historical image restores its prompt and generation parameters.
- Generated images remain stored until the user deletes them; favorites are an organizational state, not a second copy.

## Data

SQLite migrations add user email/preferences/onboarding state, workspace favorites, asset favorites, and encrypted admin system settings. User preferences store default image/text provider and model IDs plus future local-template settings.

## Verification

Backend API tests cover migrations, quotas, preferences, favorites, profiles, and admin authorization. Frontend component tests cover auth action links, onboarding, hidden model details, settings navigation, timelines, and favorites. Browser tests cover registration, setup, text generation, reference-image generation, history restoration, and responsive light/dark layouts.
