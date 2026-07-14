# Studio Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh Studio Basil's color system and motion while moving quota details into Settings and rendering generation history chronologically.

**Architecture:** Keep the existing React component boundaries. `Studio` remains responsible for generation history and passes quota state into `SettingsDrawer`; visual changes stay in the shared CSS token system so light, dark, mobile, and reduced-motion modes remain consistent.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS custom properties, Vite, Docker Compose

---

### Task 1: Lock the workspace behavior with tests

**Files:**
- Modify: `frontend/src/Studio.test.tsx`

- [ ] **Step 1: Add a failing test for chronological generation history**

Create a workspace with two runs returned newest-first, render `Studio`, and assert the visible timeline button names occur as `查看第 1 次生成`, then `查看第 2 次生成` with the old run before the new run.

```tsx
const timelineButtons = screen.getAllByRole('button', { name: /查看第 .* 次生成/ })
expect(timelineButtons.map(button => button.getAttribute('aria-label'))).toEqual([
  '查看第 1 次生成',
  '查看第 2 次生成',
])
```

- [ ] **Step 2: Add failing quota placement assertions**

Assert the banner does not contain `2 / 1000 张`. Open Settings, then assert `图片额度` exposes `2 / 1000` and `会话额度` exposes `1 / 100`.

```tsx
expect(screen.queryByText('2 / 1000 张')).not.toBeInTheDocument()
await userEvent.click(screen.getByRole('button', { name: '打开设置' }))
expect(screen.getByRole('progressbar', { name: '图片额度' })).toHaveAttribute('aria-valuenow', '2')
expect(screen.getByRole('progressbar', { name: '会话额度' })).toHaveAttribute('aria-valuenow', '1')
```

- [ ] **Step 3: Run the focused tests and confirm failure**

Run: `pnpm test -- --run src/Studio.test.tsx`

Expected: FAIL because timeline order and Settings quota content have not yet changed.

### Task 2: Implement ordering and quota placement

**Files:**
- Modify: `frontend/src/Studio.tsx`
- Modify: `frontend/src/SettingsDrawer.tsx`
- Test: `frontend/src/Studio.test.tsx`

- [ ] **Step 1: Derive chronological timeline data without changing selection**

Add `const timelineRuns = useMemo(() => [...runs].reverse(), [runs])`. Render `timelineRuns` with `查看第 ${runIndex + 1} 次生成`; leave `assets[0]` selection unchanged so the current output remains newest-first.

```tsx
const timelineRuns = useMemo(() => [...runs].reverse(), [runs])
// ...
{timelineRuns.map((run, runIndex) => (
  <button aria-label={`查看第 ${runIndex + 1} 次生成`} />
))}
```

- [ ] **Step 2: Remove quota from the main header**

Keep only the workspace title inside `.topbar-title`.

- [ ] **Step 3: Pass quota into Settings**

Add `quota: Quota` to `SettingsDrawer` props and pass `props.quota` from `Studio`.

```tsx
type Props = {
  quota: Quota
  // existing properties
}

<SettingsDrawer quota={props.quota} /* existing properties */ />
```

- [ ] **Step 4: Render quota usage in Settings Overview**

Add two `.quota-meter` blocks with exact usage text and progress bars using `aria-label="图片额度"` and `aria-label="会话额度"`, clamping percentages to `0..100`.

```tsx
<div className="quota-meter">
  <div><span>图片额度</span><strong>{props.quota.used} / {props.quota.limit}</strong></div>
  <progress aria-label="图片额度" value={props.quota.used} max={props.quota.limit} />
</div>
```

- [ ] **Step 5: Run the focused test**

Run: `pnpm test -- --run src/Studio.test.tsx`

Expected: PASS.

### Task 3: Apply Studio Neutral visual polish

**Files:**
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/Studio.tsx`

- [ ] **Step 1: Replace theme tokens**

Use cool gray canvas/surfaces, graphite text, blue-gray borders, deep teal light-theme accent, and brighter teal dark-theme accent. Preserve distinct red danger and amber warning tokens.

- [ ] **Step 2: Add restrained interaction motion**

Add 160-220 ms color, border, shadow, opacity, and transform transitions to controls, timeline thumbnails, menus, image actions, drawers, and reference thumbnails. Add entry animations for menus, drawers, modals, and selected images.

- [ ] **Step 3: Improve generation feedback**

Add a subtle non-looping surface sweep behind the existing generation status without obscuring the image or elapsed-time copy.

- [ ] **Step 4: Respect reduced motion**

Inside `prefers-reduced-motion: reduce`, disable animations and set transition duration to effectively zero for interactive elements.

- [ ] **Step 5: Build and run all frontend tests**

Run: `pnpm test -- --run`

Expected: all tests pass.

Run: `pnpm build`

Expected: Vite production build succeeds.

### Task 4: Verify, publish, and deploy

**Files:**
- Verify: repository diff and production site

- [ ] **Step 1: Run repository checks**

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 2: Commit and push**

Commit the plan, component, test, and CSS changes, then push `main` to `origin`.

- [ ] **Step 3: Deploy on the server**

In `/opt/studio-basil-xin`, run `git pull --ff-only origin main` and `docker compose up -d --build`; verify the container is healthy and `/api/health` returns `{"status":"ok"}`.

- [ ] **Step 4: Browser QA**

Use the existing Chrome `https://studio.basil.xin/` tab to confirm light/dark themes, oldest-to-newest run timeline, newest-first session drawer, quota meters only in Settings Overview, smooth drawer/menu/image transitions, and no layout overflow at desktop and mobile widths.
