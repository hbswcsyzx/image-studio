# Studio Basil UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace provider-led controls with a guided, output-first image workflow and durable conversation/favorite organization.

**Architecture:** Extend the existing FastAPI/SQLite API with additive migrations and small preference/favorite endpoints. Keep React state local, split setup/settings/history concerns into focused components, and preserve the synchronous upstream API contract while making its progress and failures visible.

**Tech Stack:** FastAPI, SQLite, Pydantic, React 19, TypeScript, Vitest, Testing Library, Docker Compose.

---

### Task 1: Persist user defaults and storage organization

**Files:** `backend/image_studio/db.py`, `backend/image_studio/auth.py`, `backend/image_studio/providers.py`, `backend/image_studio/workspaces.py`, `backend/image_studio/assets.py`, `backend/image_studio/main.py`, backend tests.

- [ ] Write failing tests for user preferences, email, model classification, 100-conversation quota, workspace favorites, and asset favorites.
- [ ] Run focused tests and verify expected failures.
- [ ] Add additive SQLite migrations and API fields/endpoints.
- [ ] Run focused and full backend tests.

### Task 2: Improve generation parameters and failure records

**Files:** `backend/image_studio/generation.py`, `backend/tests/test_generation.py`.

- [ ] Write failing tests for background, output format/compression, custom size passthrough, and failed-run serialization.
- [ ] Run focused tests and verify expected failures.
- [ ] Pass supported parameters through generation/edit requests and preserve them in run history.
- [ ] Run backend tests.

### Task 3: Build guided defaults and structured settings

**Files:** `frontend/src/types.ts`, `frontend/src/App.tsx`, `frontend/src/Onboarding.tsx`, `frontend/src/SettingsDrawer.tsx`, frontend tests.

- [ ] Write failing component tests for onboarding and separate image/text defaults.
- [ ] Run tests and verify expected failures.
- [ ] Implement the layout tour, model setup, settings navigation, profile, and admin system form.
- [ ] Run focused frontend tests.

### Task 4: Rebuild the creation workspace

**Files:** `frontend/src/Studio.tsx`, `frontend/src/styles.css`, frontend tests.

- [ ] Write failing tests for hidden model controls, reference thumbnails, generation status, run timeline, and restoring historical parameters.
- [ ] Run tests and verify expected failures.
- [ ] Implement the timeline, split control dock, style presets, advanced image settings, and progress/error states.
- [ ] Run focused frontend tests.

### Task 5: Add conversation and image organization

**Files:** `frontend/src/Studio.tsx`, `frontend/src/SessionDrawer.tsx`, frontend tests.

- [ ] Write failing tests for rename/favorite/delete and the favorite-image gallery.
- [ ] Run tests and verify expected failures.
- [ ] Implement conversation controls and gallery behavior.
- [ ] Run frontend tests and production build.

### Task 6: Deploy and verify

**Files:** no additional product files expected.

- [ ] Run backend tests, frontend tests, production build, and Compose validation.
- [ ] Verify desktop/mobile layouts and light/dark themes locally.
- [ ] Push the commit, rebuild the server Compose service, and verify health.
- [ ] Repeat registration, model setup, text generation, reference generation, history, favorite, and download flows on `https://studio.basil.xin`.
