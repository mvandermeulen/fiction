import { standardizeUrlOrPath, updateUrl, vue, waitFor } from '@fiction/core/utils'
import { FictionObject } from '@fiction/core'
import type { Ref } from 'vue'
import { computed, ref, watch } from 'vue'

// lightweight for tag
import { Obj } from '@fiction/core/obj.js'
import { LinkHandler } from './utils'

export interface FrameMessage<T = unknown> {
  from?: 'fiction'
  url?: URL
  messageType: 'frameReady' | 'navigate' | 'close' | string
  data: T
}

export type MsgAuth = { from?: 'fiction' }

export type MsgStandard =
  | { messageType: 'frameReady', data: string }
  | { messageType: 'navigate', data: string }
  | { messageType: 'close', data: boolean }

export type MsgUnknown = MsgStandard | { messageType: string, data: unknown }

type FrameUtilitySettings<T extends MsgUnknown> = {
  getWindow?: () => Window // window will change with iframe src
  getSendToWindow?: () => Window
  onMessage?: MessageListener<T>
  onFrameLoad?: LoadListener
  waitForReadySignal?: boolean
  src?: Ref<string>
  hasKeyBoardEvents?: boolean
  isTest?: boolean
  frameEl?: HTMLIFrameElement
} & ({ relation: 'parent', frameEl: HTMLIFrameElement } | { relation: 'child' })

type MessageListener<T extends MsgUnknown> = (
  message: (T | MsgUnknown) & MsgAuth,
  { frameUtility }: { frameUtility: FrameUtility<T> },
) => void

type LoadListener = <T extends MsgUnknown>(util: FrameUtility<T>) => void

export class FrameUtility<T extends MsgUnknown = FrameMessage> extends Obj<FrameUtilitySettings<T>> {
  constructor(settings: FrameUtilitySettings<T>) {
    super(`FrameUtility:${settings.relation}`, settings)
  }

  recursionDelay = 100
  initialized = false
  from: 'fiction' = 'fiction' as const
  relation = this.settings.relation
  frameEl = this.settings.frameEl
  getWindow = this.settings.getWindow || (() => window)
  getSendToWindow = this.settings.getSendToWindow || (() => (this.relation === 'child' ? this.getWindow().parent : this.frameEl?.contentWindow))
  messageBuffer: ((T | MsgStandard) & MsgAuth)[] = []
  loaded = ref(false)
  waitForReadySignal = this.settings.waitForReadySignal ?? false
  hasReadySignal = ref(!this.waitForReadySignal)
  isFrameReady = computed(() => this.hasReadySignal.value)
  src = this.settings.src || ref('')
  keyListening = false
  hasKeyBoardEvents = this.settings.hasKeyBoardEvents ?? false
  eventOrigins = ['localhost', 'fiction']
  onFrameLoad = this.settings.onFrameLoad ?? (() => {})
  messageCallbacks = new Set<MessageListener<T>>([this.settings.onMessage ?? (() => {})])
  debug = false
  cleanups: (() => void)[] = []

  init() {
    if (typeof this.getWindow() === 'undefined') {
      this.log.error('no window', { data: { getWindow: this.getWindow() } })
      return
    }

    this.initialized = true

    if (this.relation === 'parent' && this.frameEl) {
      this.parentInit()
    }
    else if (this.relation === 'child') {
      this.sendReadySignal()
      this.setupClickHandler()
    }

    watch(() => this.isFrameReady.value, v => v && this.flushBuffer())
    if (this.hasKeyBoardEvents) {
      this.setupKeyboardEvents()
    }
    this.listenForMessages()
  }

  setupClickHandler() {
    const linkHandler = new LinkHandler(this)
    linkHandler.setup()
    this.cleanups.push(() => linkHandler.cleanup())
  }

  parentInit() {
    this.src.value ||= this.frameEl?.getAttribute('src') ?? ''
    watch(() => this.src.value, v => this.parentReloadFrame(v), { immediate: true })
    this.frameEl?.addEventListener('load', async () => this.handleFrameLoad())
  }

  parentReloadFrame(src: string) {
    if (src && this.frameEl && !this.settings.isTest) {
      this.frameEl.setAttribute('src', src)
      this.loaded.value = false
    }
  }

  async handleFrameLoad() {
    if (!this.frameEl)
      return
    this.frameEl.dataset.loaded = this.src.value
    this.loaded.value = true
    await waitFor(300)
    this.onFrameLoad(this)
  }

  getUrl(): URL | undefined {
    if (!this.src.value)
      return undefined

    try {
      const baseOrigin = this.getWindow().location.origin
      return new URL(this.src.value, baseOrigin)
    }
    catch (error) {
      this.log.error('Invalid URL', { data: { src: this.src.value, error } })
      return undefined
    }
  }

  onMessage(cb: MessageListener<T>) {
    this.messageCallbacks.add(cb)
  }

  onMessageReceived(event: MessageEvent) {
    const msg = event.data as FrameMessage

    if (this.debug)
      this.log.debug(`postMessage received (${this.relation} -> ${msg.messageType})`, { data: { msg } })

    if (!msg || typeof msg !== 'object' || msg.from !== 'fiction')
      return

    msg.url = this.getUrl()

    // if child send frameReady, it's ready for messages
    if (msg.messageType === 'frameReady' && !this.hasReadySignal.value)
      this.hasReadySignal.value = true

    this.recursionProtection('set', msg.messageType)

    this.messageCallbacks.forEach(cb => cb(msg, { frameUtility: this }))
  }

  private messageListener: ((e: MessageEvent) => void) | null = null

  clear() {
    if (this.messageListener)
      this.getWindow().removeEventListener('message', this.messageListener)

    this.cleanups.forEach(cleanup => cleanup())
    this.cleanups = []
  }

  listenForMessages(): void {
    const win = this.getWindow()
    this.messageListener = e => this.onMessageReceived(e)
    win.addEventListener('message', this.messageListener, false)
  }

  sendReadySignal(): void {
    const sendToWindow = this.getSendToWindow()
    if (!sendToWindow)
      throw new Error('no message window')

    sendToWindow.postMessage({ from: 'fiction', messageType: 'frameReady', data: window.origin }, '*')
  }

  flushBuffer() {
    const sendToWindow = this.getSendToWindow()

    // this.log.debug('flush', {
    //   data: { sendToWindow, initialized: this.initialized, frameReady: this.isFrameReady.value, sig: this.hasReadySignal.value },
    // })

    if (!sendToWindow)
      return
    if (!this.isFrameReady.value)
      return

    this.messageBuffer.forEach(async (msg) => {
      if (this.debug)
        this.log.debug(`postMessage send (${this.relation} -> ${msg.messageType})`, { data: { msg } })
      msg.from = this.from

      const isProtected = this.recursionProtection('get', msg.messageType)

      if (isProtected) {
        this.log.debug('recursion protection triggered', { data: { msg } })
        return
      }

      const sendMessage = JSON.parse(JSON.stringify(msg)) as T

      sendToWindow.postMessage(sendMessage, '*')
    })
    this.messageBuffer = []
  }

  sendMessage(args: { message: (T | MsgStandard) & MsgAuth }): void {
    const { message } = args
    this.messageBuffer.push(message)
    this.flushBuffer()
  }

  recursionProtector: Record<string, boolean> = {}
  recursionProtection(mode: 'set' | 'get', messageType: string) {
    if (mode === 'set') {
      this.recursionProtector[messageType] = true
      setTimeout(() => {
        this.recursionProtector[messageType] = false
      }, this.recursionDelay)
    }

    return this.recursionProtector[messageType]
  }

  setupKeyboardEvents() {
    const sendOnKeys = new Set(['Alt', 'Control', 'Meta'])
    const handleKeyEvent = (event: KeyboardEvent, direction: 'down' | 'up') => {
      if (sendOnKeys.has(event.key)) {
        this.sendMessage({
          message: {
            messageType: 'keypress',
            data: { direction, key: event.key },
          } as T,
        })
      }
    }

    this.getWindow().addEventListener('keydown', e => handleKeyEvent(e, 'down'))
    this.getWindow().addEventListener('keyup', e => handleKeyEvent(e, 'up'))
    this.keyListening = true
  }
}

type FrameNavigatorSettings = {
  updateCallback: (path: string) => void
  urlOrPath: Ref<string>
  displayUrl: Ref<string>
}

export class FrameNavigator extends FictionObject<FrameNavigatorSettings> {
  typedPath = vue.ref<string>('')
  setPath = vue.ref<string>('')
  displayUrl = this.settings.displayUrl
  history: string[] = []
  currentIndex = -1

  constructor(settings: FrameNavigatorSettings) {
    super('FrameNavigator', settings)
    this.init()
  }

  displayUrlObject = vue.computed(() => {
    const url = this.settings.displayUrl?.value
    const originalDisplayUrl = new URL(url || '/', 'http://dummybase.com')
    originalDisplayUrl.pathname = this.typedPath.value || ''
    return originalDisplayUrl
  })

  init() {
    vue.watch(
      () => this.displayUrl.value,
      (v) => {
        const displayUrlPath = new URL(v, 'http://dummybase.com').pathname
        this.setNewPath({ fullPath: displayUrlPath, updateHistory: true })
      },
      { immediate: true },
    )
  }

  pathname = vue.computed(() => {
    const urlOrPath = this.settings.urlOrPath.value
    return standardizeUrlOrPath({ urlOrPath: urlOrPath ? new URL(urlOrPath, 'https://dummybase.com').pathname : '' })
  })

  update(newValue: string) {
    const u = updateUrl({ newUrlOrPath: newValue, url: this.pathname.value })
    this.settings.updateCallback(u)
  }

  setNewPath({ fullPath, updateHistory = true }: { fullPath: string, updateHistory?: boolean }): void {
    const np = standardizeUrlOrPath({ urlOrPath: fullPath })

    if (np !== this.pathname.value) {
      this.typedPath.value = np
      this.setPath.value = np
      this.update(np)

      if (updateHistory) {
        // Don't add duplicate entries to history
        if (this.history.length === 0 || np !== this.history[this.currentIndex]) {
          // Clear forward history if we're not at the end
          if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1)
          }
          this.history.push(np)
          this.currentIndex = this.history.length - 1
        }
      }
    }
  }

  async navigateFrame(dir: 'forward' | 'backward'): Promise<void> {
    if (dir === 'forward' && this.canGoForward()) {
      this.currentIndex++
    }
    else if (dir === 'backward' && this.canGoBack()) {
      this.currentIndex--
    }
    else {
      return
    }

    const newPath = this.history[this.currentIndex]
    this.setNewPath({ fullPath: newPath, updateHistory: false })
  }

  canGoBack(): boolean {
    return this.currentIndex > 0
  }

  canGoForward(): boolean {
    return this.currentIndex < this.history.length - 1
  }

  getCurrentPath(): string {
    return this.history[this.currentIndex] || ''
  }

  getHistory(): string[] {
    return [...this.history]
  }

  clearHistory(): void {
    this.history = [this.getCurrentPath()]
    this.currentIndex = 0
  }
}
