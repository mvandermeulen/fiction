import type { vue } from '@fiction/core/utils'
import type { EnvVar } from '@fiction/core/plugin-env'

export * from '@fiction/core'
export * from '@fiction/site'
export * from '@fiction/cards'
export * from '@fiction/ui'

export interface CreateSiteSettings {
  serverPort?: number
  appPort?: number
  cwd?: string
  mainFilePath?: string
  envFiles?: string[]
  env?: Record<string, string>
  checkEnvVars?: string[]
  rootComponent?: vue.Component
  uiPaths?: string[]
  envVars?: () => EnvVar<string>[]
  version?: string
  isGlobalSetup?: boolean
}

export function createSite(opts?: CreateSiteSettings) {
  return { }
}
