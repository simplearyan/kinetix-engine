# Kinetix Core

**The High-Performance, Framework-Agnostic Video Engine for the Web.**

Kinetix Core is a pure TypeScript library for orchestrating and exporting frame-perfect video directly in the browser. It decouples the rendering loop from the UI, allowing you to build complex video editors, motion graphics tools, and generative art pipelines that work at 60 FPS regardless of the user's device speed.

[Documentation](https://kinetix.dev) | [Examples](https://kinetix.dev/examples) | [Sponsoring](#sponsoring) | [License](#license)

## Features

- **Rendering Agnostic**: Built on the native Canvas 2D API, but extensible for WebGL.
- **Frame-Perfect Offline Export**: Renders video frame-by-frame using Web Workers to ensure 0 drop frames, even at 4K resolution.
- **Framework Free**: Works with React, Vue, Svelte, or Vanilla JS. No framework overhead.
- **Timeline Control**: Precise `seek()`, `play()`, `pause()` with millisecond accuracy.
- **Zero Dependencies**: (Core engine) - lightweight and tree-shakable.

## Quick Start

### Installation

```bash
npm install @kinetix/core
```

### Basic Usage

```typescript
import { Engine, TextObject } from '@kinetix/core';

// 1. Initialize Engine on a Canvas
const canvas = document.getElementById('my-canvas');
const engine = new Engine(canvas);

// 2. Add Objects
const text = new TextObject('hello-1', 'Hello World');
text.x = 100;
text.y = 100;
text.animation = { type: 'fadeIn', duration: 1000, delay: 0 };

engine.scene.add(text);

// 3. Play
engine.play();

// 4. Export Video
const blob = await engine.exportVideo(5000); // Export 5s video
```

## Sponsoring

Kinetix Core is open source and free to use. However, maintaining a complex video engine requires significant time and effort.
If you are building a commercial product with Kinetix, please consider sponsoring development.

[Become a Sponsor](https://github.com/sponsors/antigravity)

**Sponsors get:**
- Priority Bug Fixes
- Early access to new plugins (e.g. Chart.js adapter)
- Direct implementation support

## Core Dependencies

Kinetix is possible thanks to these amazing open-source projects:


- **[mediabunny](https://github.com/simplearyan/mediabunny)**: Frame-perfect video encoding and resource management.

## License

This project is licensed under the **Mozilla Public License 2.0**.

- **Use it freely**: Component libraries, closed-source apps, commercial tools.
- **Contribute back**: If you modify the engine files, you must share those specific modifications.

See [LICENSE](./LICENSE) for details.
