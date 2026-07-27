const baseGlyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const katakanaGlyphs =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
const fontSize = 15
const frameDuration = 1000 / 24

export type MicroAppViewport = {
  width: number
  height: number
  devicePixelRatio: number
  backingWidth: number
  backingHeight: number
}

export type MicroAppHost = {
  canvas: HTMLCanvasElement
  signal: AbortSignal
  requestFrame: (callback: FrameRequestCallback) => number
  cancelFrame: (handle: number) => void
}

export type MicroAppActivation = {
  reason: 'page-init' | 'user-launch' | 'restore'
  userInitiated: boolean
}

export type MicroApp = {
  mount: (host: MicroAppHost) => void
  activate: (activation: MicroAppActivation) => void
  suspend: (reason: 'minimized' | 'page-hidden') => void
  resize: (viewport: MicroAppViewport) => void
  destroy: () => void
}

export type MicroAppDefinition = {
  apiVersion: 1
  manifest: {
    id: string
    title: string
    description: string
    window: {
      preferredWidth: number
      preferredHeight: number
      minWidth: number
      minHeight: number
      resizable: boolean
    }
  }
  create: () => MicroApp
}

function randomGlyph() {
  const glyphs = Math.random() < 0.1 ? katakanaGlyphs : baseGlyphs
  return glyphs[Math.floor(Math.random() * glyphs.length)]
}

function createHeckApp(): MicroApp {
  let host: MicroAppHost | undefined
  let context: CanvasRenderingContext2D | undefined
  let viewport: MicroAppViewport | undefined
  let animationFrame = 0
  let lastFrame = 0
  let columns: number[] = []
  let active = false

  const drawGlitch = (width: number, height: number) => {
    if (!context) return

    context.save()
    context.globalCompositeOperation = 'screen'
    context.fillStyle = 'rgb(128 255 170 / 0.12)'
    context.fillRect(0, 0, width, 1)
    context.fillRect(0, height - 1, width, 1)
    context.fillRect(0, 0, 1, height)
    context.fillRect(width - 1, 0, 1, height)
    context.restore()
  }

  const draw = (timestamp: number) => {
    animationFrame = 0
    if (!active || !host || !context || !viewport) return

    const drawContext = context
    const drawViewport = viewport
    animationFrame = host.requestFrame(draw)
    if (timestamp - lastFrame < frameDuration) return
    lastFrame = timestamp - ((timestamp - lastFrame) % frameDuration)

    drawContext.fillStyle = 'rgb(0 0 0 / 0.17)'
    drawContext.fillRect(0, 0, drawViewport.width, drawViewport.height)
    drawContext.font = `${fontSize}px "Courier New", monospace`
    drawContext.textBaseline = 'top'

    columns.forEach((row, column) => {
      const x = column * fontSize
      const y = row * fontSize
      drawContext.fillStyle = Math.random() > 0.92 ? '#d6ffe2' : '#00ff41'
      drawContext.fillText(randomGlyph(), x, y)
      columns[column] = y > drawViewport.height + Math.random() * 120 ? 0 : row + 1
    })

    drawGlitch(drawViewport.width, drawViewport.height)
  }

  const suspend = () => {
    active = false
    if (host && animationFrame) host.cancelFrame(animationFrame)
    animationFrame = 0
  }

  return {
    mount(nextHost) {
      if (host) throw new Error('Heck is already mounted')

      const nextContext = nextHost.canvas.getContext('2d', { alpha: true })
      if (!nextContext) throw new Error('Heck requires a 2D canvas context')

      host = nextHost
      context = nextContext
    },

    activate() {
      if (!host || !context) throw new Error('Heck must be mounted before activation')
      if (active) return

      active = true
      animationFrame = host.requestFrame(draw)
    },

    suspend,

    resize(nextViewport) {
      if (!context) throw new Error('Heck must be mounted before resize')

      viewport = nextViewport
      context.setTransform(nextViewport.devicePixelRatio, 0, 0, nextViewport.devicePixelRatio, 0, 0)
      columns = Array.from({ length: Math.ceil(nextViewport.width / fontSize) }, () =>
        Math.floor((Math.random() * nextViewport.height) / fontSize)
      )
    },

    destroy() {
      suspend()
      columns = []
      viewport = undefined
      context = undefined
      host = undefined
    },
  }
}

export const heckApp: MicroAppDefinition = {
  apiVersion: 1,
  manifest: {
    id: 'heck',
    title: 'Heck',
    description: 'Hack the planet',
    window: {
      preferredWidth: 360,
      preferredHeight: 300,
      minWidth: 220,
      minHeight: 220,
      resizable: false,
    },
  },
  create: createHeckApp,
}

export default heckApp
