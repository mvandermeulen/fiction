import type { EndpointResponse, FictionDb, FictionEmail, FictionEnv, FictionPluginSettings, FictionServer, FictionUser, TableMediaConfig } from '@fiction/core'
import { FictionPlugin, safeDirname, vue } from '@fiction/core'
import type { FictionTransactions } from '@fiction/plugin-transactions'
import { CardTemplate, createCard } from '@fiction/site'
import multer from 'multer'
import { FormData } from 'formdata-node'
import { tables } from './schema'
import { ManageSubscriptionQuery, UploadCSVEndpoint } from './endpoint'
import { getEmails } from './email'

export * from './schema'

type FictionSubscribeSettings = {
  fictionDb: FictionDb
  fictionServer: FictionServer
  fictionEmail: FictionEmail
  fictionEnv: FictionEnv
  fictionUser: FictionUser
  fictionTransactions: FictionTransactions
} & FictionPluginSettings

export class FictionSubscribe extends FictionPlugin<FictionSubscribeSettings> {
  csvFileName = 'csvFile'
  queries = {
    ManageSubscription: new ManageSubscriptionQuery({ fictionSubscribe: this, ...this.settings }),
    UploadCSV: new UploadCSVEndpoint({ fictionSubscribe: this, ...this.settings }),
  }

  requests = this.createRequests({
    queries: this.queries,
    fictionServer: this.settings.fictionServer,
    fictionUser: this.settings.fictionUser,
    basePath: '/subscribe',
    middleware: () => [multer().single(this.csvFileName)],
  })

  transactions = getEmails({ fictionSubscribe: this })

  cacheKey = vue.ref(0)

  constructor(settings: FictionSubscribeSettings) {
    super('FictionSubscribe', { root: safeDirname(import.meta.url), ...settings })
    this.settings.fictionDb?.addTables(tables)

    this.addAdminPages()
  }

  addAdminPages() {
    this.settings.fictionEnv.addHook({
      hook: 'adminPages',
      caller: 'FictionSubscribe',
      context: 'app',
      callback: async (pages, meta) => {
        const { templates } = meta
        return [
          ...pages,
          createCard({
            templates,
            templateId: 'dash',
            slug: 'subscriber',
            title: 'Subscribers',
            cards: [
              createCard({ el: vue.defineAsyncComponent(() => import('./admin/ViewIndex.vue')) }),
            ],
            userConfig: {
              isNavItem: true,
              navIcon: 'i-tabler-users',
              navIconAlt: 'i-tabler-users-plus',
              priority: 50,
            },
          }),
          createCard({
            templates,
            templateId: 'dash',
            slug: 'subscriber-view',
            title: 'Subscriber',
            cards: [
              createCard({ el: vue.defineAsyncComponent(() => import('./admin/ViewSingle.vue')) }),
            ],
          }),
          createCard({
            templates,
            templateId: 'dash',
            slug: 'subscriber-add',
            title: 'Add Subscribers',
            cards: [
              createCard({ el: vue.defineAsyncComponent(() => import('./admin/ViewAdd.vue')) }),
            ],
          }),
        ]
      },
    })
  }

  async uploadFile(params: { file?: File, formData?: FormData }): Promise<EndpointResponse<TableMediaConfig>> {
    const { file, formData = new FormData() } = params

    if (file)
      formData.append(this.csvFileName, file)

    const r = await this.requests.UploadCSV.upload({ data: formData, params: { _action: 'uploadCsv', test: 12 } })

    return r
  }
}
