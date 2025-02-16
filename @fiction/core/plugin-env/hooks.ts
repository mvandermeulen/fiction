import type { JSONSchema } from 'json-schema-to-typescript'
import type { CliOptions } from './types.js'

export interface FictionEnvHookDictionary {
  runCommand: {
    args: [string, CliOptions]
  }
  staticConfig: {
    args: [Record<string, unknown>]
  }
  staticSchema: {
    args: [JSONSchema['properties']]
  }
}
