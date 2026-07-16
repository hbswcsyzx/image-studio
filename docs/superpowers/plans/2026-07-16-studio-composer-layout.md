# Studio Composer Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the bottom dock around a unified prompt workflow, compact settings/generate column, dual-axis resize handle, and top error notifications.

**Architecture:** Keep `Studio` as the state owner and convert `PromptCollaboration` from a modal into a controlled inline child. Preserve existing backend endpoints and image generation data flow. Use CSS grid for layout and pointer events for all three resize gestures.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS Grid, Lucide React.

---

### Task 1: Specify the new interaction in tests

**Files:**
- Modify: `frontend/src/Studio.test.tsx`
- Create: `frontend/src/PromptCollaboration.test.tsx`

- [ ] **Step 1: Add a failing Studio layout test**

Render `Studio`, assert that `归纳当前会话预设` is in `.topbar-actions`, no standalone top-right collaboration button exists, `.generation-dock` has one `.input-zone` and one `.settings-generate-zone`, `.mode-indicator` is absent, and `.reference-grid` is contained by `.reference-rail`.

- [ ] **Step 2: Add a failing resize-corner test**

Fire `pointerDown` on `.corner-resizer`, move from `(88, 500)` to `(168, 410)`, and assert CSS variables become `168px` and `380px`.

- [ ] **Step 3: Add a failing collaboration test**

Render inline collaboration, submit a request with a mocked endpoint returning an assistant message, assert `onSuggestion` receives the assistant content, and assert no button contains `采用`.

- [ ] **Step 4: Run focused tests and confirm expected failures**

Run `pnpm exec vitest run src/Studio.test.tsx src/PromptCollaboration.test.tsx --pool=threads --maxWorkers=1 --testTimeout=10000`. Expected failures reference missing `.corner-resizer`, `.settings-generate-zone`, inline mode control, and `onSuggestion`.

### Task 2: Convert prompt collaboration to an inline controlled region

**Files:**
- Modify: `frontend/src/PromptCollaboration.tsx`
- Test: `frontend/src/PromptCollaboration.test.tsx`

- [ ] **Step 1: Replace modal props**

Use `active`, existing request context props, `onSuggestion(prompt)`, and `onError(message)`. Return `null` only when inactive. Remove backdrop, dialog close controls, all `Check` imports, and every adoption button.

- [ ] **Step 2: Synchronize assistant results automatically**

After a successful POST, append returned messages, find the last assistant message, and call `onSuggestion(content)` before clearing the composer.

- [ ] **Step 3: Forward errors**

Remove local dock error rendering and call `onError` with the normalized error string.

- [ ] **Step 4: Run the focused collaboration test**

Run `pnpm exec vitest run src/PromptCollaboration.test.tsx --pool=threads --maxWorkers=1 --testTimeout=10000`. Expected: all tests pass.

### Task 3: Rebuild Studio dock and mode control

**Files:**
- Modify: `frontend/src/Studio.tsx`
- Test: `frontend/src/Studio.test.tsx`

- [ ] **Step 1: Replace modal state with refinement mode**

Use `const [refinementMode, setRefinementMode] = useState<'quick' | 'collaborate'>('quick')`. Render one `refinement-mode-control` button plus an icon-only `切换润色模式` button in the input header.

- [ ] **Step 2: Move references to a vertical rail**

Render upload/library controls and all selected reference thumbnails inside `.reference-rail`; keep the prompt textarea or inline collaboration in `.prompt-workspace` beside it.

- [ ] **Step 3: Merge settings and generation**

Render image preset, size, quality, count, advanced fields, and `生成图片` inside `.settings-generate-zone`. Delete `.action-zone` and `.mode-indicator`.

- [ ] **Step 4: Move preset derivation action**

Keep the title centered with only the workspace name and render the existing derivation action inside `.topbar-actions`.

- [ ] **Step 5: Wire automatic collaboration suggestion**

Pass `onSuggestion={setPrompt}` and keep the prompt textarea mounted in quick mode with the synchronized value.

- [ ] **Step 6: Run focused Studio tests**

Run `pnpm exec vitest run src/Studio.test.tsx --pool=threads --maxWorkers=1 --testTimeout=10000`. Expected: all tests pass.

### Task 4: Add dual-axis resize and notifications

**Files:**
- Modify: `frontend/src/Studio.tsx`
- Modify: `frontend/src/styles.css`
- Test: `frontend/src/Studio.test.tsx`

- [ ] **Step 1: Generalize resize logic**

Allow resize kind `timeline | dock | both`; capture both initial dimensions; for `both`, update timeline width from horizontal delta and dock height from inverse vertical delta.

- [ ] **Step 2: Render the corner handle**

Add `.corner-resizer` at `left: calc(var(--timeline-width) - 6px)` and `bottom: calc(var(--dock-height) - 6px)` with `cursor: nwse-resize`.

- [ ] **Step 3: Replace bottom error rendering**

Render `.error-toast` near the top center with `role="alert"` and an icon-only close button. Add an effect that clears a non-empty error after 8000 ms.

- [ ] **Step 4: Run resize and notification tests**

Run the focused Studio tests. Expected: simultaneous resize updates both variables, and errors render outside `.generation-dock` with a close button.

### Task 5: Style and responsive verification

**Files:**
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Implement desktop layout**

Set `.generation-dock` to `minmax(0, 1fr) 260px`; set `.input-zone` to a two-column reference rail/workspace layout; keep collaboration history bounded by the dock height.

- [ ] **Step 2: Implement responsive layout**

Below 720px, stack input and settings, turn the reference rail horizontal, and hide all resize handles.

- [ ] **Step 3: Build production assets**

Run `pnpm build`. Expected: TypeScript and Vite complete with exit code 0.

- [ ] **Step 4: Browser geometry check**

Verify the live DOM has history at the left edge, settings in the right dock column, references beside the prompt, no adoption action, and the corner drag changes both CSS variables.

### Task 6: Commit and deploy

**Files:**
- Modify: deployment state only

- [ ] **Step 1: Commit and push**

Run `git diff --check`, commit with `feat: refine studio prompt workspace`, and push `main`.

- [ ] **Step 2: Deploy**

On `/opt/studio-basil-xin`, run `git pull --ff-only` and `docker compose up -d --build`.

- [ ] **Step 3: Verify production**

Run `docker compose ps`, `curl -fsS http://127.0.0.1:8787/api/health`, and confirm the deployed Git HEAD matches the pushed commit.

