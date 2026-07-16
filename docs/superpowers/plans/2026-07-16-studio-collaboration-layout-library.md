# Studio Collaboration, Layout, and Reference Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-turn prompt collaboration, a reusable reference library, browser image caching, and resizable Studio panels without changing the direct generation workflow.

**Architecture:** Persist collaboration messages and deduplicated uploaded references in SQLite alongside existing user-owned assets. Reuse the existing Responses-compatible text provider for prompt collaboration and the existing workspace detail endpoint for rendering. Keep layout and decoded image state client-side, scoped by authenticated user and browser.

**Tech Stack:** FastAPI, SQLite, React, TypeScript, Vite, browser Cache API, CSS Grid.

---

### Task 1: Persist reference uploads and prompt collaboration

**Files:**
- Modify: `backend/image_studio/db.py`
- Modify: `backend/image_studio/assets.py`
- Create: `backend/image_studio/prompt_collaboration.py`
- Modify: `backend/image_studio/main.py`
- Test: `backend/tests/test_assets.py`
- Test: `backend/tests/test_prompt_collaboration.py`

- [ ] Write tests that a byte-identical reference upload returns the existing user-owned asset, a different user cannot reuse it, and a collaboration turn stores an assistant candidate prompt.
- [ ] Add SHA-256 content hashes to assets and a `prompt_collaboration_messages` table owned by a workspace and user.
- [ ] Store uploaded reference files as `reference` assets without counting them toward generated-image quota; return existing matching asset for the same user hash.
- [ ] Add collaboration endpoints that receive workspace, text provider, references, and a user message; save user and assistant messages; include recent messages, selected style, settings, and reference images in the Responses request.
- [ ] Run the focused backend tests.

### Task 2: Add the compact prompt collaboration surface

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api.ts`
- Create: `frontend/src/PromptCollaboration.tsx`
- Modify: `frontend/src/Studio.tsx`
- Modify: `frontend/src/styles.css`
- Test: `frontend/src/PromptCollaboration.test.tsx`

- [ ] Write a component test for opening collaboration, sending a brief, rendering a candidate, and applying it to the image prompt.
- [ ] Build the opt-in drawer/panel so direct generation remains the default surface.
- [ ] Keep quick optimization unchanged and label it `快速润色`; add `提示词协作` for multi-turn message history.
- [ ] Let users apply the latest candidate to the main prompt without automatically generating an image.
- [ ] Run the focused frontend test and production build.

### Task 3: Add resizable layout and authorized browser image caching

**Files:**
- Create: `frontend/src/layout.ts`
- Create: `frontend/src/imageCache.ts`
- Modify: `frontend/src/Studio.tsx`
- Modify: `frontend/src/styles.css`
- Test: `frontend/src/layout.test.ts`
- Test: `frontend/src/imageCache.test.ts`

- [ ] Write tests for clamped persisted split sizes and cache keys scoped to a user ID plus asset ID.
- [ ] Add pointer-driven vertical and horizontal splitters with keyboard-accessible reset behavior; persist dimensions in local storage per user.
- [ ] Render timeline thumbnails and output images with contained responsive sizing derived from panel dimensions.
- [ ] Cache authenticated image responses only after loading them through an authorized asset URL; serve cached object URLs on subsequent workspace switches and revoke them when unused.
- [ ] Run focused tests and production build.

### Task 4: Expose the reference library

**Files:**
- Modify: `backend/image_studio/assets.py`
- Modify: `frontend/src/Studio.tsx`
- Modify: `frontend/src/styles.css`
- Test: `backend/tests/test_assets.py`
- Test: `frontend/src/Studio.test.tsx`

- [ ] Add a user-owned reference-asset list endpoint with metadata and content URLs.
- [ ] Add a reference-library picker under the upload controls; selecting an item adds its asset ID to the same ten-image combined reference limit.
- [ ] Ensure removing a workspace keeps reusable reference assets intact and deleting a reference asset removes only its own file.
- [ ] Run the complete backend and frontend suites.

### Task 5: Deploy and verify

**Files:**
- Modify: deployment image through existing `Dockerfile` and `docker-compose.yml` build flow only.

- [ ] Commit the implementation and push `main`.
- [ ] Pull on `/opt/studio-basil-xin`, rebuild with `docker compose up -d --build`, and verify health.
- [ ] In Chrome, verify resizers move, reference reuse avoids duplicate upload, prompt collaboration applies a candidate, and previously viewed images remain visible after workspace switching.
