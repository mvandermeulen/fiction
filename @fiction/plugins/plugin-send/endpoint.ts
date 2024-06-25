import type { EndpointMeta, EndpointResponse, IndexQuery } from '@fiction/core'
import { Query, dayjs } from '@fiction/core'
import type { ManageSubscriptionParams } from '@fiction/plugin-subscribe/endpoint'
import { CronJob } from 'cron'
import type { Subscriber } from '@fiction/plugin-subscribe'
import { t } from './schema'
import type { EmailCampaignConfig } from './schema.js'
import type { FictionSend, FictionSendSettings } from '.'

export type SendEndpointSettings = {
  fictionSend: FictionSend
} & FictionSendSettings

abstract class SendEndpoint extends Query<SendEndpointSettings> {
  db = () => this.settings.fictionDb.client()
  constructor(settings: SendEndpointSettings) {
    super(settings)
  }
}

export type WhereSend = { campaignId?: string }
type StandardFields = { orgId: string, userId?: string, loadDraft?: boolean }

export type ManageCampaignRequestParams =
  | { _action: 'create', fields: EmailCampaignConfig[] }
  | { _action: 'update', where: WhereSend[], fields: Partial<EmailCampaignConfig> }
  | { _action: 'delete', where: WhereSend[] }
  | { _action: 'list' } & IndexQuery
  | { _action: 'get', where: WhereSend, loadDraft?: boolean }
  | { _action: 'send', where: WhereSend }

export type ManageCampaignParams = ManageCampaignRequestParams & StandardFields

export type ManageCampaignResponse = EndpointResponse<EmailCampaignConfig[]>

export class ManageCampaign extends SendEndpoint {
  limit = 10
  offset = 0
  async run(params: ManageCampaignParams, meta: EndpointMeta): Promise<ManageCampaignResponse> {
    const { _action } = params

    let r: ManageCampaignResponse | undefined
    switch (_action) {
      case 'create':
        r = await this.create(params, meta)
        break
      case 'list':
        r = await this.list(params, meta)
        break
      case 'get':
        r = await this.get(params, meta)
        break
      case 'update':
        r = await this.update(params, meta)
        break
      case 'delete':
        r = await this.delete(params, meta)
        break
      case 'send':
        r = await this.send(params, meta)
        break

      default:
        r = { status: 'error', message: 'Invalid action' }
    }

    if (!r) {
      return { status: 'error', message: 'Invalid action' }
    }

    return await this.refineResponse(params, r, meta)
  }

  private async refineResponse(params: ManageCampaignParams, r: ManageCampaignResponse, _meta: EndpointMeta): Promise<ManageCampaignResponse> {
    const { orgId, loadDraft } = params
    const { limit = this.limit, offset = this.offset } = params as { limit?: number, offset?: number }

    const { count } = await this.db().table(t.send).where({ orgId }).count().first<{ count: string }>()

    r.indexMeta = { limit, offset, count: +count, ...r.indexMeta }

    if (r.data) {
      const promises = r.data.map(async (row) => {
        if (!row.postId || row.post) {
          return row
        }

        const post = await this.settings.fictionPosts.queries.ManagePost.serve({ _action: 'get', orgId, postId: row.postId, loadDraft }, _meta)
        row.post = post.data
        return row
      })

      r.data = await Promise.all(promises)
    }

    return r
  }

  private async send(params: ManageCampaignParams & { _action: 'send' }, meta: EndpointMeta): Promise<ManageCampaignResponse> {
    const { orgId, where, userId } = params
    const { timeZone = 'UTC' } = meta

    const r = await this.get({ _action: 'get', orgId, where, userId, loadDraft: true }, meta)

    const campaign = r.data?.[0]

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    const now = dayjs().toISOString()
    const scheduledAt = campaign.scheduleMode === 'now' ? now : campaign.scheduledAt

    if (!scheduledAt) {
      throw new Error('No scheduled date available')
    }
    else if (dayjs(scheduledAt).add(1, 'hour').isBefore(now)) {
      throw new Error('Scheduled date is in the past')
    }

    const r2 = await this.update({ _action: 'update', orgId, userId, where: [where], fields: { status: 'requested', scheduledAt } }, meta)

    const message = campaign.scheduleMode === 'now' ? `Email is being sent, check back soon.` : `Email scheduled ${dayjs(scheduledAt).tz(timeZone).format(`MMM DD, YYYY [at] h:mm A [${timeZone}]`)}`

    return { status: 'success', message, data: r2.data }
  }

  private async create(params: ManageCampaignParams & { _action: 'create' }, meta: EndpointMeta): Promise<ManageCampaignResponse> {
    const { orgId, fields, userId } = params

    const { fictionDb } = this.settings

    const promises = fields.map(async (f) => {
      const sendFields: Partial<EmailCampaignConfig> = { orgId, ...f }
      const postFields = { type: 'email' as const, orgId, userId, ...f.post }

      this.log.info('creating email', { data: postFields })
      const r = await this.settings.fictionPosts.queries.ManagePost.serve({ _action: 'create', orgId, userId, fields: postFields }, meta)

      const post = r.data

      if (!post?.postId) {
        throw new Error('Post not created')
      }

      const insertFields = fictionDb.prep({ type: 'insert', fields: sendFields, meta, table: t.send })
      const insertData: EmailCampaignConfig = { orgId, userId, postId: post.postId, ...insertFields }

      const [row] = await this.db().table(t.send).insert(insertData).returning('*')

      const r2 = await this.get({ _action: 'get', orgId, where: { campaignId: row.campaignId } }, meta)

      const campaign = r2.data?.[0]

      if (!campaign) {
        throw new Error('Campaign not created')
      }

      return campaign
    })

    const data = await Promise.all(promises)

    return { status: 'success', message: 'created successfully', data, indexMeta: { changedCount: fields.length } }
  }

  private async get(params: ManageCampaignParams & { _action: 'get' }, meta: EndpointMeta): Promise<ManageCampaignResponse> {
    const r = await this.list({ ...params, _action: 'list', filters: [{ field: 'campaignId', operator: '=', value: params.where.campaignId || '' }] }, meta)

    const ManageSubscription = this.settings.fictionSubscribe.queries.ManageSubscription
    const sub = await ManageSubscription.serve({ _action: 'count', orgId: params.orgId }, meta)

    if (r.data?.[0]) {
      r.data[0].subscriberCount = sub.indexMeta?.count || 0
    }

    return r
  }

  private async list(params: ManageCampaignParams & { _action: 'list' }, _meta: EndpointMeta): Promise<ManageCampaignResponse> {
    const { orgId, limit = this.limit, offset = this.offset, filters = [] } = params
    const query = this.db().select('*').from(t.send).where({ orgId }).orderBy('updatedAt', 'desc').limit(limit).offset(offset)

    filters.forEach((filter) => {
      if (filter.field && filter.operator && filter.value)
        void query.where(filter.field, filter.operator, filter.value)
      else
        throw new Error('Invalid filter')
    })

    const r = await query

    return { status: 'success', data: r }
  }

  private async update(params: ManageCampaignParams & { _action: 'update' }, meta: EndpointMeta): Promise<ManageCampaignResponse> {
    const { where, fields, orgId, userId } = params

    if (!Array.isArray(where)) {
      return { status: 'error', message: 'where must be an array of conditions' }
    }

    const prepped = this.settings.fictionDb.prep({ type: 'update', fields, meta, table: t.send })

    this.log.info('updating email', { data: { fields, prepped } })

    const promises = where.map(async (w) => {
      const result = await this.db().table(t.send).where({ orgId, ...w }).update({ ...prepped, updatedAt: new Date().toISOString() }).limit(1).returning<EmailCampaignConfig[]>('*')
      const row = result[0]
      const postId = row?.postId

      if (!postId) {
        this.log.error('No postId found for email send', { orgId, userId, campaignId: row?.campaignId })
        return row
      }

      const r = await this.settings.fictionPosts.queries.ManagePost.serve({ _action: 'update', orgId, userId, postId, fields: { ...fields.post } }, meta)

      row.post = r.data

      return row
    })

    const data = (await Promise.all(promises)).filter(Boolean)

    return { status: 'success', data, indexMeta: { changedCount: data.length }, message: 'Updated Successfully' }
  }

  private async delete(params: ManageCampaignParams & { _action: 'delete' }, _meta: EndpointMeta): Promise<ManageCampaignResponse> {
    const { where, orgId } = params

    if (!Array.isArray(where)) {
      return { status: 'error', message: 'where must be an array of conditions' }
    }

    const promises = where.map(async (w) => {
      const row = await this.db().select('*').table(t.send).where({ orgId, ...w }).first<EmailCampaignConfig>()
      if (!row) {
        return
      }

      const postId = row.postId

      // foreign key constraint will delete post and email row if post is deleted
      if (postId) {
        const r = await this.settings.fictionPosts.queries.ManagePost.serve({ _action: 'delete', orgId, postId }, _meta)
        row.post = r.data
      }
      else {
        await this.db().table(t.send).where({ orgId, ...w }).delete()
      }

      return row
    })

    const data = (await Promise.all(promises)).filter(Boolean) as EmailCampaignConfig[]

    return { status: 'success', message: `${data.length} items deleted`, data, indexMeta: { changedCount: data.length } }
  }
}

export class ManageXXX extends SendEndpoint {
  crontab = '*/2 * * * *'
  limit = 10
  offset = 0
  emailBatchSize = 10
  init() {
    this.startCronJob()
  }

  async run(_params: ManageCampaignParams, _meta: EndpointMeta): Promise<EndpointResponse> {
    return { status: 'success' }
  }

  // Method to scan and send scheduled emails
  private async scanAndSendrequestedCampaigns(): Promise<void> {
    const now = dayjs().toISOString()

    // Find emails with status 'scheduled' and scheduledAt in the past
    const requestedCampaigns = await this.db()
      .table(t.send)
      .where('status', 'requested')
      .where('scheduledAt', '<=', now)
      .select<EmailCampaignConfig[]>('*')

    await Promise.all(requestedCampaigns.map(campaign => this.processCampaign(campaign)))
  }

  // Method to process each email
  private async processCampaign(campaign: EmailCampaignConfig): Promise<void> {
    try {
      const { orgId, campaignId, userId } = campaign

      if (!orgId || !campaignId) {
        throw new Error('Invalid campaign')
      }

      const ManageCampaign = this.settings.fictionSend.queries.ManageCampaign
      // Update email status to 'processing'
      await ManageCampaign.serve({ _action: 'update', where: [{ campaignId }], orgId, fields: { status: 'processing' } }, { server: true })

      // Process subscribers in batches to prevent blocking
      const subscriberBatchSize = 100 // Define subscriber batch size
      let offset = 0
      let hasMoreSubscribers = true

      while (hasMoreSubscribers) {
        const subscribers = await this.getSubscribers(orgId, subscriberBatchSize, offset)

        if (subscribers.length < subscriberBatchSize) {
          hasMoreSubscribers = false
        }

        await Promise.all(subscribers.map(subscriber => this.sendEmailToSubscriber(campaign, subscriber)))
        offset += subscriberBatchSize
      }

      // Update email status to 'ready'
      await ManageCampaign.serve({ _action: 'update', orgId, userId, where: [{ campaignId: campaign.campaignId }], fields: { status: 'ready' } }, { server: true })
    }
    catch (error) {
      // Handle errors and retries
      this.log.error(`Error processing campaign ${campaign.campaignId}:`, { error })
      // Optionally update status to 'failed' or handle retries
    }
  }

  // Method to get subscribers with limit and offset
  private async getSubscribers(orgId: string, limit: number, offset: number): Promise<Subscriber[]> {
    const params: ManageSubscriptionParams = { _action: 'list', orgId, limit, offset }
    const result = await this.settings.fictionSubscribe.queries.ManageSubscription.run(params, {})
    return result.data || []
  }

  private async sendEmailToSubscriber(campaign: EmailCampaignConfig, subscriber: Subscriber): Promise<void> {
    const email = subscriber.email

    if (!email) {
      throw new Error('Invalid email')
    }

    // Run spam check and verify score (assumed methods, adjust as necessary)
    const isSpamFree = await this.runSpamCheck(email)
    const isScoreValid = await this.verifyScore(email)

    if (isSpamFree && isScoreValid) {
      await this.sendEmail(campaign, subscriber)
    }
  }

  private async runSpamCheck(email: string): Promise<boolean> {
    // Replace with actual implementation
    return true
  }

  private async verifyScore(email: string): Promise<boolean> {
    // Replace with actual implementation
    return true
  }

  private async sendEmail(campaign: EmailCampaignConfig, subscriber: Subscriber): Promise<void> {
    // Replace with actual implementation
  }

  // Method to start the cron job
  private startCronJob() {
    const job = new CronJob(this.crontab, () => {
      this.scanAndSendrequestedCampaigns().catch(console.error)
    })

    job.start()
  }
}
