import path from 'node:path'
import { renderSSRHead } from '@unhead/ssr'
import { renderToString } from '@vue/server-renderer'
import { JSDOM } from 'jsdom'
import type { ViteDevServer } from 'vite'
import { type MainFile, type ServiceConfig, compileApplication } from '@fiction/core/plugin-env'
import type { RunVars } from '../../inject'
import { populateGlobal } from '../../utils/globalUtils'
import { FictionObject } from '../../plugin'
import type { RenderedHtmlParts } from '../types'
import { log } from '../../plugin-log'
import { crossVar } from '../../utils/vars'
import { fastHash } from '../../utils'

const logger = log.contextLogger('SSR')

export type SSRSettings = {
  appUrl: string
  distFolderServerMountFile: string
  mountFilePath: string
  mainFilePath: string
  viteServer?: ViteDevServer
}

export class SSR extends FictionObject<SSRSettings> {
  revertGlobal?: () => void

  init(): RenderedHtmlParts {
    return { bodyAttrs: '', headTags: '', htmlAttrs: '', bodyTags: '', bodyTagsOpen: '', htmlBody: '' }
  }

  constructor(settings: SSRSettings) {
    super('SSR', settings)
  }

  serviceConfig: ServiceConfig | undefined
  async getMainFile(mode: 'prod' | 'dev' | 'test'): Promise<MainFile> {
    if (mode === 'prod')
      return await import(/* @vite-ignore */ path.join(this.settings.mainFilePath)) as MainFile
    else
      return await this.settings.viteServer?.ssrLoadModule(this.settings.mainFilePath) as MainFile
  }

  async getServiceConfig(args: { mode?: 'prod' | 'dev' | 'test', runVars: Partial<RunVars> }): Promise<ServiceConfig> {
    const { mode = 'dev', runVars } = args
    if (!this.serviceConfig) {
      const mainFile = await this.getMainFile(mode)
      const serviceConfig = await mainFile.setup({ context: 'app' })

      this.serviceConfig = serviceConfig
    }

    this.serviceConfig.runVars = runVars

    await compileApplication({ context: 'app', serviceConfig: this.serviceConfig, runVars })

    return this.serviceConfig
  }

  startGlobals(args: { runVars: Partial<RunVars>, simulateWindow?: boolean }) {
    // set flag used to determine if app code is running in vite

    crossVar.set('IS_VITE', 'yes')

    const pathname = args.runVars.PATHNAME
    const { simulateWindow = false } = args

    /**
     * Allow for window object during SSR. Potentially useful as libraries sometimes assume window.
     * However, this is probably a BAD idea as dependencies use window object to control node v browser behavior
     * and its global oriented, leading to errors with no traceable cause and effect.
     */
    if (simulateWindow) {
      // Simulate window object using jsdom
      const url = `${this.settings.appUrl}${pathname}`
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url })

      const r = populateGlobal(globalThis, dom.window, { bindFunctions: true })

      this.revertGlobal = r.revert
    }
  }

  revertGlobals() {
    crossVar.delete('IS_VITE')

    this.revertGlobal?.()
  }

  cache = new Map<string, RenderedHtmlParts>()

  getCacheKey(runVars: Partial<RunVars>) {
    const { RUN_MODE, URL, RUNTIME_COMMIT } = runVars

    return fastHash({ RUN_MODE, URL, RUNTIME_COMMIT })
  }

  async getParts(args: { runVars: Partial<RunVars> }) {
    const { runVars } = args
    let out = this.init()
    const pathname = runVars.PATHNAME
    const mode = runVars.RUN_MODE

    const cacheKey = this.getCacheKey(runVars)

    if (mode === 'prod') {
      if (this.cache.has(cacheKey) && mode === 'prod') {
        this.log.info('cache hit', { data: { URL: runVars.URL } })
        return this.cache.get(cacheKey) as RenderedHtmlParts
      }
      else {
        this.log.info('cache miss', { data: { URL: runVars.URL } })
      }
    }

    const serviceConfig = await this.getServiceConfig({ mode, runVars })

    const appEntry = await serviceConfig.createMount?.({ renderRoute: pathname, serviceConfig })

    if (!appEntry)
      throw new Error('SSR Error: rendering failed')

    const { app, meta, service } = appEntry

    /**
     * Pass context for rendering (available useSSRContext())
     * vitejs/plugin-vue injects code in component setup() that registers the component
     * on the context. Allowing us to orchestrate based on this.
     */

    const ctx: { modules?: string[] } = {}
    out.htmlBody = await renderToString(app, ctx)

    /**
     * Meta/Head Rendering
     */
    const head = await renderSSRHead(meta)
    out = { ...out, ...head }

    service.fictionEnv?.cleanup({ reason: 'ssr' })

    if (mode === 'prod')
      this.cache.set(cacheKey, out)

    return out
  }

  async render(args: { runVars: Partial<RunVars> }): Promise<RenderedHtmlParts> {
    const { runVars } = args
    try {
      this.startGlobals({ runVars })
      return await this.getParts({ runVars })
    }
    catch (error) {
      logger.error(`SSR Error (${runVars.PATHNAME}) - ${(error as Error).message}`, { error })
      return this.init()
    }
    finally {
      this.revertGlobals()
    }
  }
}
