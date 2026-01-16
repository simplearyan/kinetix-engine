# Kinetix Core Roadmap 2024

This document outlines the strategic plan to evolve **Kinetix Core** from an extracted module into a production-ready, community-driven open source library.

## Phase 1: Foundation (Current Status)
**Goal:** Establish a stable, standalone library build.

- [x] **Extraction**: Separate core engine logic (`Core`, `Scene`, `Object`) from the application.
- [x] **Documentation**: Initial `README.md` and `LICENSE`.
- [ ] **Build System**:
    - [ ] Set up `package.json` with `module` (ESM) and `main` (CJS) entry points.
    - [ ] Configure `vite.config.ts` (library mode) or `tsup` for bundling.
    - [ ] Ensure type definitions (`.d.ts`) are generated correctly.
- [ ] **Dependency Cleanup**:
    - [ ] Remove any residual React hooks or app-specific utility calls.
    - [ ] Inline or publish core utilities (Math helpers).

## Phase 2: Core Stability & Testing
**Goal:** Guarantee reliability for production use.

- [ ] **Test Suite**:
    - [ ] Setup **Vitest** for unit testing `Scene` logic and `Animation` math.
    - [ ] Create a "Headless" test environment (using `node-canvas` or similar mock) to verify rendering pipelines in CI.
- [ ] **Worker bundling**:
    - [ ] Solve the "Worker URL" problem for library users (e.g., provide a hosted worker URL or a way to inline the worker code as a Blob).
- [ ] **Standard Objects**:
    - [ ] Refactor `TextObject` and `ChartObject` into a clean, extensible API.
    - [ ] Add `ImageObject` and `VideoObject` as core primitives.

## Phase 3: Developer Experience (DX)
**Goal:** Make it easy to use.

- [ ] **API Documentation**:
    - [ ] Install **TypeDoc** or **Starlight** to generate a static documentation site.
    - [ ] Write "How-To" guides: "Creating your first animation", "Exporting video".
- [ ] **Examples Repository**:
    - [ ] Create a `examples/` folder with vanilla JS, React, and Vue demos.
- [ ] **Plugins System**:
    - [ ] Define a `Plugin` interface (e.g., `install(engine)`).
    - [ ] Create official plugins: `@kinetix/chart-js` (adapter), `@kinetix/syntax-highlight` (Shiki integration).

## Phase 4: Framework Integrations
**Goal:** Seamless usage in modern stacks.

- [ ] **@kinetix/react**:
    - [ ] `<KinetixCanvas />` component.
    - [ ] `useKinetix()` hook for accessing the engine instance.
- [ ] **@kinetix/vue**:
    - [ ] Vue composables and components.

## Phase 5: Advanced Performance
**Goal:** Unlocking native-like constraints.

- [ ] **WebGL Renderer**:
    - [ ] Implement a WebGL backend for the `Scene` to support thousands of sprites.
- [ ] **Client-Side MP4 Encoding**:
    - [ ] Integrate WASM-based FFmpeg or a custom MP4 muxer (like `mp4-muxer`) to support MP4 export directly in client (currently relies on `mediabunny` or similar).

## Contributing
We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) (Coming Soon) for details on how to set up the dev environment.
