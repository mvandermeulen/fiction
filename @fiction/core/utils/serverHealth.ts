import process from 'node:process'
import type express from 'express'
import { log } from '../plugin-log'
import { getCommit, getVersion } from './vars'
import { getNodeOs } from './nodeUtils.js'

export function getServerHealth(args: { expressApp: express.Express, id: string }) {
  const { expressApp, id = 'unknown' } = args
  const memoryUsage = process.memoryUsage()
  const cpuUsage = process.cpuUsage()
  const os = getNodeOs()
  const loadAverage = os.loadavg()
  const uptime = process.uptime()

  const healthData = {
    id,
    status: 'success',
    message: 'ok',
    version: getVersion(),
    duration: uptime,
    timestamp: Date.now(),
    commit: getCommit(),
    memoryUsage: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
    },
    cpuUsage: { user: cpuUsage.user, system: cpuUsage.system },
    loadAverage: { '1m': loadAverage[0], '5m': loadAverage[1], '15m': loadAverage[2] },
    environment: process.env.NODE_ENV || 'development',
    requestCount: expressApp.get('requestCount'),
    activeConnections: 0, // You will need to implement logic to get active connections
  }

  log.info('expressApp', 'health check request', { data: healthData })

  return healthData
}

export function addExpressHealthCheck(args: { expressApp: express.Express, basePath?: string, id: string }) {
  const { expressApp, basePath = '/health', id } = args
  expressApp.set('requestCount', 0)

  // Middleware to count requests
  expressApp.use((req, res, next) => {
    expressApp.set('requestCount', expressApp.get('requestCount') + 1)
    next()
  })

  expressApp.use(basePath, (request, response) => {
    const healthData = getServerHealth({ expressApp, id })

    response.status(200).send(healthData).end()
  })
}
