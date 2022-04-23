import path from "path"
import { createRequire } from "module"
import { expect, it, describe } from "vitest"
import { execaCommandSync, execaCommand, ExecaChildProcess } from "execa"
import { chromium, Browser, Page } from "playwright"
import { expect as expectUi, Expect } from "@playwright/test"
import fs from "fs-extra"
import { getEnvVars, deepMergeAll } from "../utils"
import { randomBetween, log } from ".."
import { getServerUserConfig, handleCrossEnv, UserConfig } from "../config"
import { FactorUser, FullUser } from "../plugin-user"
import { PackageJson } from "../types"
import { FactorDb } from "../plugin-db"
import { FactorEmail } from "../plugin-email"

const require = createRequire(import.meta.url)

const getModuleName = (cwd: string): string => {
  const pkg = require(`${cwd}/package.json`) as PackageJson
  return pkg.name
}

export const getTestCwd = (): string => {
  return path.dirname(require.resolve("@factor/site/package.json"))
}

export const getTestEmail = (): string => {
  const key = Math.random().toString().slice(2, 8)
  return `arpowers+${key}@gmail.com`
}

export type TestServerConfig = {
  _process: ExecaChildProcess
  portApp: string
  port: string
  serverUrl: string
  userConfig: UserConfig
  destroy: () => Promise<void>
  browser: Browser
  page: Page
  expectUi: Expect
  appUrl: string
}

export type TestUtils = {
  user: FullUser | undefined
  token: string
  email: string
  factorDb: FactorDb
  factorUser: FactorUser
  factorEmail: FactorEmail
  serverUrl: string
}

export const createTestUtils = async (): Promise<TestUtils> => {
  const vars = [
    { v: "postgresUrl", val: process.env.POSTGRES_URL },
    { v: "googleClientId", val: process.env.GOOGLE_CLIENT_ID },
    { v: "googleClientSecret", val: process.env.GOOGLE_CLIENT_SECRET },
  ] as const

  const env = getEnvVars({
    vars,
    isLive: false,
    isApp: true,
  })

  const serverUrl = `http://localhost:${process.env.FACTOR_SERVER_PORT}`
  const appUrl = `http://localhost:${process.env.FACTOR_APP_PORT}`

  const factorEmail = new FactorEmail({
    appEmail: "arpowers@gmail.com",
    appName: "TestApp",
    appUrl,
    isTest: true,
  })

  const factorDb = new FactorDb({ connectionUrl: env.postgresUrl })

  const factorUser = new FactorUser({
    factorDb,
    factorEmail,
    googleClientId: env.googleClientId,
    googleClientSecret: env.googleClientSecret,
    serverUrl,
    mode: "development",
    tokenSecret: "test",
  })

  const key = Math.random().toString().slice(2, 12)
  const email = `arpowers+${key}@gmail.com`
  const r = await factorUser.queries.ManageUser.serve(
    {
      fields: { email: `arpowers+${key}@gmail.com`, emailVerified: true },
      _action: "create",
    },
    { server: true },
  )

  const user = r.data
  const token = r.token

  if (!token) throw new Error("token not returned")
  if (!user) throw new Error("no user created")

  factorUser.setCurrentUser({ user, token })

  factorUser.setUserInitialized()

  return { user, token, email, factorUser, factorDb, factorEmail, serverUrl }
}

export const createTestServer = async (params: {
  cwd?: string
  moduleName?: string
  headless?: boolean
  slowMo?: number
  userConfig?: UserConfig
}): Promise<TestServerConfig> => {
  const { port, portApp } = params.userConfig || {}
  const { headless = true, slowMo } = params
  let { moduleName } = params
  const cwd = params.cwd || process.cwd()

  moduleName = moduleName || getModuleName(cwd)

  const crossVars = handleCrossEnv({
    port: String(port || randomBetween(1000, 9000)),
    portApp: String(portApp || randomBetween(1000, 9000)),
    mode: "development",
  })

  const mainFilePath = require.resolve(moduleName)
  const userConfig = await getServerUserConfig({
    mainFilePath,
    userConfig: deepMergeAll([crossVars, params.userConfig || {}]),
  })

  let _process: ExecaChildProcess | undefined

  const cmd = [
    `npm exec -w ${moduleName} --`,
    `factor rdev`,
    `--port ${crossVars.port}`,
    `--port-app ${crossVars.portApp}`,
  ]

  const runCmd = cmd.join(" ")

  log.info("createTestServer", `Creating test server for ${moduleName}`, {
    data: { ...crossVars, cwd: process.cwd(), cmd: runCmd },
  })

  await new Promise<void>((resolve) => {
    _process = execaCommand(runCmd, {
      env: { TEST_ENV: "unit" },
    })
    _process.stdout?.pipe(process.stdout)
    _process.stderr?.pipe(process.stderr)

    _process.stdout?.on("data", (d: Buffer) => {
      const out = d.toString()

      if (out.includes("[ready]")) resolve()
    })
  })

  if (!_process) throw new Error("Could not start dev server")

  const browser = await chromium.launch({ headless, slowMo })
  const page = await browser.newPage()

  return {
    _process,
    ...crossVars,
    browser,
    page,
    expectUi,
    userConfig,
    destroy: async () => {
      if (_process) {
        _process.cancel()
        _process.kill("SIGTERM")
      }
      await browser.close()
    },
  }
}

export const appBuildTests = (config: {
  moduleName?: string
  cwd?: string
}): void => {
  let { cwd = "", moduleName } = config
  const port = String(randomBetween(1000, 9000))
  const portApp = String(randomBetween(1000, 9000))

  cwd = cwd || path.dirname(require.resolve(`${moduleName}/package.json`))

  moduleName = moduleName || getModuleName(cwd)

  if (!cwd) throw new Error("cwd is not defined")

  describe.skip(`build app: ${moduleName}`, () => {
    it("prerenders", () => {
      const command = `npm exec -w ${moduleName} -- factor prerender --port ${port} --port-app ${portApp}`

      log.info("appBuildTests", "running prerender command", { data: command })
      const r = execaCommandSync(command, {
        env: { TEST_ENV: "unit" },
        timeout: 30_000,
      })

      expect(r.stdout).toContain("built successfully")
      fs.existsSync(path.join(cwd, "./dist/static"))
    })

    it.skip("runs dev", () => {
      const r = execaCommandSync(
        `npm exec -w ${moduleName} -- factor rdev --exit --port ${port} --port-app ${portApp}`,
        {
          env: { TEST_ENV: "unit" },
          timeout: 20_000,
        },
      )

      expect(r.stdout).toContain("build variables")
      expect(r.stdout).toContain(`[ ${port} ]`)
      expect(r.stdout).toContain(`[ ${portApp} ]`)
      expect(r.stdout).toContain("[ready]")
    })

    it("renders", async () => {
      const { destroy, page, appUrl } = await createTestServer({
        moduleName,
        userConfig: { port, portApp },
      })

      const errorLogs: string[] = []
      page.on("console", (message) => {
        if (message.type() === "error") {
          errorLogs.push(message.text())
        }
      })

      page.on("pageerror", (err) => {
        errorLogs.push(err.message)
      })
      await page.goto(appUrl)

      const html = await page.innerHTML("body")

      if (errorLogs.length > 0) {
        console.error(errorLogs)
      }

      expect(errorLogs.length).toBe(0)
      expect(html).toBeTruthy()

      await destroy()
    }, 20_000)
  })
}
