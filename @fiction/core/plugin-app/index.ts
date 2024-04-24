import type http from 'node:http'
import path from 'node:path'
import type * as vite from 'vite'
import type { Config as TailwindConfig } from 'tailwindcss'
import type { Express } from 'express'
import { createHead } from '@unhead/vue'
import { initializeResetUi, isTest, safeDirname, vue } from '../utils'
import type { FictionAppEntry, FictionEnv, ServiceConfig, ServiceList } from '../plugin-env'
import { FictionPlugin } from '../plugin'
import type { FictionBuild } from '../plugin-build'
import { AppRoute, type FictionRouter } from '../plugin-router'
import type { RunVars, StandardServices } from '../inject'
import { FictionRender } from './plugin-render'
import ElRoot from './ElRoot.vue'
import type { FictionSitemap } from './sitemap'
import type { SiteMapEntry } from './types'

export interface FictionAppSettings {
  mode?: 'production' | 'development'
  isTest?: boolean
  liveUrl?: string
  localHostname?: string
  isLive?: vue.Ref<boolean>
  altHostnames?: { dev: string, prod: string }[]
  port: number
  fictionEnv: FictionEnv
  rootComponent?: vue.Component
  fictionRouter: FictionRouter
  sitemaps?: SiteMapEntry[]
  tailwindConfig?: Partial<TailwindConfig>[]
  srcFolder?: string
  mainIndexHtml?: string
  publicFolder?: string
  appInstanceId?: string // to differentiate multiple apps
  [key: string]: unknown
}

export class FictionApp extends FictionPlugin<FictionAppSettings> {
  isLive = this.settings.isLive ?? this.settings.fictionEnv.isProd
  viteDevServer?: vite.ViteDevServer
  hooks = this.settings.hooks ?? []
  isTest = this.settings.isTest || isTest()
  rootComponent = this.settings.rootComponent || ElRoot
  fictionBuild?: FictionBuild
  fictionSitemap?: FictionSitemap
  fictionRender?: FictionRender
  sitemaps = this.settings.sitemaps ?? []
  port = this.settings.port || 3000
  appServer?: http.Server
  staticServer?: http.Server
  localHostname = this.settings.localHostname || `localhost`
  localUrl = `http://${this.localHostname}:${this.port}`
  liveUrl = vue.ref(this.settings.liveUrl || this.localUrl)
  appUrl = vue.computed(() => {
    const isLive = this.settings.isLive?.value ?? false
    return isLive ? this.liveUrl.value : this.localUrl
  })

  srcFolder = this.settings.srcFolder || this.settings.fictionEnv.cwd
  mainIndexHtml = this.settings.mainIndexHtml || path.join(this.srcFolder, 'index.html')
  publicFolder = this.settings.publicFolder || path.join(this.srcFolder, 'public')

  appInstanceId = this.settings.appInstanceId || 'app'
  root = safeDirname(import.meta.url)

  constructor(settings: FictionAppSettings) {
    super('FictionApp', settings)

    /**
     * node application init
     */
    if (!this.settings.fictionEnv.isApp.value && this.settings.fictionEnv?.cwd) {
      this.fictionRender = new FictionRender({
        fictionApp: this,
        fictionEnv: this.settings.fictionEnv,
        fictionRouter: this.settings.fictionRouter,
      })
    }

    // add testing routes
    this.settings.fictionRouter.update([new AppRoute({ name: 'renderTest', path: '/render-test', component: (): Promise<any> => import('./test/TestRunVars.vue') })])

    this.addSchema()
  }

  addSchema() {
    if (this.settings.fictionEnv) {
      this.settings.fictionEnv.addHook({
        hook: 'staticSchema',
        callback: async (existing) => {
          const routeKeys = this.settings.fictionRouter.routes.value?.map(_ => _.name).filter(Boolean).sort()

          return { ...existing, routes: { enum: routeKeys, type: 'string' }, menus: { enum: [''], type: 'string' } }
        },
      })

      this.settings.fictionEnv.addHook({
        hook: 'staticConfig',
        callback: (
          schema: Record<string, unknown>,
        ): Record<string, unknown> => {
          return { ...schema, routes: this.settings.fictionRouter.routes.value?.map(ep => ({ key: ep.name, path: ep.path })) }
        },
      })
    }
  }

  addSitemap(sitemap: SiteMapEntry) {
    this.sitemaps = [...this.sitemaps, sitemap]
  }

  tailwindConfig = this.settings.tailwindConfig ?? []
  addTailwindConfig(tailwindConfig: Partial<TailwindConfig>) {
    this.tailwindConfig = [...this.tailwindConfig, tailwindConfig]
  }

  async buildApp(options: { render?: boolean, serve?: boolean } = {}) {
    if (this.settings.fictionEnv.isApp.value)
      return

    return this.fictionRender?.buildApp(options)
  }

  async serveStaticApp() {
    if (this.settings.fictionEnv.isApp.value)
      return
    return this.fictionRender?.serveStaticApp()
  }

  createVueApp = async (args: {
    renderRoute?: string
    runVars?: Partial<RunVars>
    service: ServiceList & Partial<StandardServices>
  }): Promise<FictionAppEntry> => {
    const { renderRoute, service, runVars } = args

    const router = this.settings.fictionRouter.create({ caller: `mountApp:${this.appInstanceId}` })

    if (renderRoute)
      await this.settings.fictionRouter.replace({ path: renderRoute }, { caller: 'createVueApp' })

    await this.settings.fictionEnv.runHooks('afterAppSetup', { service })

    const app: vue.App = renderRoute
      ? vue.createSSRApp(this.rootComponent)
      : vue.createApp(this.rootComponent)

    this.settings.fictionEnv.service.value = { ...this.settings.fictionEnv.service.value, ...service, runVars }
    app.provide('service', this.settings.fictionEnv.service)

    app.use(router)

    await router.isReady()
    const meta = createHead()
    app.use(meta)
    return { app, router, meta, service }
  }

  /**
   * this runs during rendering and browser
   */
  async mountApp(args: {
    selector?: string
    mountEl?: Element
    renderRoute?: string
    runVars?: Partial<RunVars>
    service: ServiceList & Partial<StandardServices>
    serviceConfig?: ServiceConfig
  }): Promise<FictionAppEntry> {
    const { selector = '#app', renderRoute, service, runVars, serviceConfig } = args

    if (serviceConfig)
      await this.settings.fictionEnv.crossRunCommand({ context: 'app', serviceConfig, runVars })

    const entry = await this.createVueApp({ renderRoute, runVars, service })

    if (typeof window !== 'undefined' && !this.settings.fictionEnv.isSSR.value) {
      await this.settings.fictionEnv.runHooks('beforeAppMounted', entry)

      const mountEl = args.mountEl || document.querySelector(selector)

      if (!mountEl)
        throw new Error(`mountEl not found: ${selector}`)

      initializeResetUi(this.settings.fictionRouter).catch(console.error)
      entry.app.mount(mountEl)

      document.documentElement.style.opacity = '1'
      document.documentElement.style.transform = 'none'
      mountEl.classList.remove('loading')
      mountEl.classList.add('loaded')

      await this.settings.fictionEnv.runHooks('appMounted', entry)
    }

    return entry
  }

  logReady(args: { serveMode: string }) {
    const app = this.settings.fictionEnv.meta.app || {}
    const { port, appInstanceId, liveUrl, localUrl, settings } = this
    const serveMode = args.serveMode
    const isLive = this.isLive.value ?? false
    const data: Record<string, any> = { instanceId: appInstanceId, app, port, liveUrl: liveUrl.value, localUrl, isLive, serveMode }

    if (settings.altHostnames?.length) {
      const mode = isLive ? 'prod' : 'dev'
      const port = isLive ? '' : `:${this.port}`
      const protocol = isLive ? 'https' : 'http'

      data.altUrls = settings.altHostnames.map(_ => `${protocol}://${_[mode]}${port}`)
    }

    this.log.info(`serving app [ready]`, { data })
  }

  async ssrServerSetup(
    args: { isProd?: boolean, expressApp?: Express } = {},
  ): Promise<Express | undefined> {
    if (this.settings.fictionEnv.isApp.value || !this.fictionRender)
      return

    const { isProd = false, expressApp } = args
    const eApp = await this.fictionRender.createExpressApp({ isProd, expressApp })

    return eApp
  }

  async ssrServerCreate(
    args: { isProd?: boolean, expressApp?: Express } = {},
  ): Promise<http.Server | undefined> {
    const { isProd = false, expressApp } = args
    if (this.settings.fictionEnv.isApp.value || !this.fictionRender)
      return

    const eApp = await this.ssrServerSetup({ isProd, expressApp })

    await new Promise<void>((resolve) => {
      this.appServer = eApp?.listen(this.port, () => resolve())
    })

    this.logReady({ serveMode: 'ssr' })

    return this.appServer
  }

  async close() {
    this.log.info('close app')
    this.appServer?.close()
    this.staticServer?.close()
    await this.fictionRender?.viteDevServer?.close()
  }
}
