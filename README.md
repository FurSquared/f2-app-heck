# Heck

The framework-free canvas micro app behind the **Heck** window on the FurSquared Y2K site.

## Host contract

The package exports a versioned definition with a small lifecycle:

- `mount` receives a host-owned canvas and frame scheduler.
- `activate` starts the draw loop.
- `suspend` stops drawing while the window or page is hidden.
- `resize` receives the canvas content size and device pixel ratio.
- `destroy` releases the app instance.

The host owns the canvas element and its backing dimensions. Heck owns only its drawing state and lifecycle.

```ts
import heckApp from '@fursquared/f2-app-heck'

const app = heckApp.create()
app.mount(host)
app.resize(viewport)
app.activate({ reason: 'user-launch', userInitiated: true })
```

## Development

```sh
npm install
npm run dev
npm test
npm run build
```

The Vite playground provides a draggable, resizable desktop window and exercises mount, resize, suspend, activate, destroy, and reopen behavior. Its shell lives outside the package `files` allowlist.

Publishing a `v*` tag runs the package checks and publishes the matching package version to GitHub Packages.
