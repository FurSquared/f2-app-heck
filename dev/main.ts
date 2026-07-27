import heckApp, { type MicroApp, type MicroAppActivation } from '../src'
import './styles.css'

const appWindow = document.querySelector<HTMLElement>('#app-window')!
const surface = document.querySelector<HTMLElement>('#app-surface')!
const canvas = document.querySelector<HTMLCanvasElement>('#app-canvas')!
const titleBar = document.querySelector<HTMLElement>('#title-bar')!
const desktopShortcut = document.querySelector<HTMLButtonElement>('#desktop-shortcut')!
const taskButton = document.querySelector<HTMLButtonElement>('#task-button')!
const minimizeButton = document.querySelector<HTMLButtonElement>('#minimize')!
const closeButton = document.querySelector<HTMLButtonElement>('#close')!
const status = document.querySelector<HTMLElement>('#status')!

let app: MicroApp | undefined
let abortController: AbortController | undefined
let minimized = false

const updateStatus = () => {
  const state = !app ? 'closed' : minimized ? 'suspended' : document.hidden ? 'page hidden' : 'active'
  status.textContent = `${state} · ${canvas.width}×${canvas.height}`
}

const resize = () => {
  if (!app) return

  const rect = surface.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2)
  const width = Math.max(1, rect.width)
  const height = Math.max(1, rect.height)
  const backingWidth = Math.max(1, Math.round(width * devicePixelRatio))
  const backingHeight = Math.max(1, Math.round(height * devicePixelRatio))
  if (canvas.width !== backingWidth) canvas.width = backingWidth
  if (canvas.height !== backingHeight) canvas.height = backingHeight
  app.resize({ width, height, devicePixelRatio, backingWidth, backingHeight })
  updateStatus()
}

const activate = (activation: MicroAppActivation) => {
  if (!app || minimized || document.hidden) return
  app.activate(activation)
  updateStatus()
}

const mount = (activation: MicroAppActivation) => {
  if (app) {
    activate(activation)
    return
  }

  abortController = new AbortController()
  app = heckApp.create()
  app.mount({
    canvas,
    signal: abortController.signal,
    requestFrame: (callback) => window.requestAnimationFrame(callback),
    cancelFrame: (handle) => window.cancelAnimationFrame(handle),
  })
  resize()
  activate(activation)
}

const open = () => {
  const reason = app ? 'restore' : 'user-launch'
  minimized = false
  appWindow.hidden = false
  taskButton.hidden = false
  mount({ reason, userInitiated: true })
  updateStatus()
}

const minimize = () => {
  minimized = true
  app?.suspend('minimized')
  appWindow.hidden = true
  updateStatus()
}

const close = () => {
  app?.destroy()
  abortController?.abort()
  app = undefined
  abortController = undefined
  minimized = false
  appWindow.hidden = true
  taskButton.hidden = true
  canvas.width = 1
  canvas.height = 1
  updateStatus()
}

new ResizeObserver(resize).observe(surface)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) app?.suspend('page-hidden')
  else activate({ reason: 'restore', userInitiated: false })
  updateStatus()
})
desktopShortcut.addEventListener('dblclick', open)
taskButton.addEventListener('click', open)
minimizeButton.addEventListener('click', minimize)
closeButton.addEventListener('click', close)

let drag:
  | {
      pointerId: number
      offsetX: number
      offsetY: number
    }
  | undefined

titleBar.addEventListener('pointerdown', (event) => {
  if ((event.target as Element).closest('button')) return
  const rect = appWindow.getBoundingClientRect()
  drag = {
    pointerId: event.pointerId,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  }
  titleBar.setPointerCapture(event.pointerId)
})
titleBar.addEventListener('pointermove', (event) => {
  if (drag?.pointerId !== event.pointerId) return
  appWindow.style.left = `${Math.max(0, event.clientX - drag.offsetX)}px`
  appWindow.style.top = `${Math.max(0, event.clientY - drag.offsetY)}px`
})
titleBar.addEventListener('pointerup', (event) => {
  if (drag?.pointerId === event.pointerId) titleBar.releasePointerCapture(event.pointerId)
  drag = undefined
})

mount({ reason: 'page-init', userInitiated: false })
