import dayjs from 'dayjs'
import { emitEvent } from '@fiction/core/utils/event'
import type { EndpointResponse } from '@fiction/core/types'
import { objectId } from '@fiction/core/utils/id'
import { deepMerge } from '@fiction/core/utils/obj'
import { WriteBuffer } from '@fiction/core/utils/buffer'
import type { LogHelper } from '@fiction/core/plugin-log'
import { log } from '@fiction/core/plugin-log'
import { UnloadUtility } from '../utils/tracking'
import { baseBrowserEvent } from './utils'
import type { IdentifyTraitsUser, TrackingEvent, TrackingEventUserDefined, TrackingProperties } from './types'

export * from './types'

interface ClientRequestOptions {
  sync?: boolean
}

type FictionClientResponse = EndpointResponse<TrackingEvent>

export type GenType = 'internal' | 'core' | 'user'

export interface FictionClientSettings {
  orgId: string
  siteId?: string
  anonymousId: string
  beaconUrl: string
  namespace?: string
  intervalSeconds?: number
  gen?: GenType
}

export class FictionClient extends WriteBuffer<TrackingEvent> {
  orgId: string
  siteId?: string
  anonymousId: string
  beaconUrl: string
  pixelPath = '/pixel'
  trackPath = '/events'
  namespace: string
  intervalSeconds: number
  log: LogHelper
  gen: GenType
  logToConsole = false
  constructor(settings: FictionClientSettings) {
    super({ limit: 5, maxSeconds: settings.intervalSeconds })

    this.namespace = settings.namespace || 'AnalyticsClient'
    this.orgId = settings.orgId
    this.siteId = settings.siteId
    this.anonymousId = settings.anonymousId
    this.gen = settings.gen || 'user'
    this.log = log.contextLogger(this.namespace)

    this.intervalSeconds = settings.intervalSeconds || 2
    this.beaconUrl = settings.beaconUrl

    if (this.logToConsole)
      this.log.debug('new client created', { data: this })

    // on page unload, clear events
    UnloadUtility.onUnload(() => this.unload())
  }

  // override of empty WriteBuffer function
  protected override flush(events: TrackingEvent[]): void {
    return this.transmitSync({ events })
  }

  public unload(): void {
    this.flushBuffer()
  }

  getQueryArgs(params: { events: TrackingEvent[] }): string {
    const { events } = params
    const args = new URLSearchParams()
    args.set('events', JSON.stringify(events))
    args.set('orgId', this.orgId)

    if (typeof window !== 'undefined' && window.fictionIsFake)
      args.set('isFake', '1')

    return args.toString()
  }

  private transmitSync(args: {
    events?: TrackingEvent[]
    endpoint?: string
    done?: () => void
    fail?: () => void
  }): void {
    const { events, done, fail, endpoint = this.pixelPath } = args
    const img = new Image()

    if (done)
      img.addEventListener('load', done)
    if (fail)
      img.addEventListener('error', fail)

    const baseUrl = `${this.beaconUrl}${endpoint}`

    if (events && events.length > 0) {
      const msg = `beacon(sync): ${events.length} events`
      const url = `${baseUrl}?${this.getQueryArgs({ events })}`
      img.src = url
      if (this.logToConsole)
        this.log.info(msg, { data: { url, events, baseUrl } })
    }
  }

  private async transmit(args: {
    events: TrackingEvent[]
    endpoint?: string
  }): Promise<FictionClientResponse> {
    const { events } = args

    const baseUrl = `${this.beaconUrl}${this.trackPath}`

    if (events && events.length > 0) {
      const msg = `get(async): ${events.length} events`
      const url = `${baseUrl}?${this.getQueryArgs({ events })}`

      if (this.logToConsole)
        this.log.info(msg, { data: { url, events, baseUrl } })

      if (!fetch)
        throw new Error('FictionClient: fetch is not available')

      // methods and mode are same as default (GET/cors)
      // The keepalive option indicates that the request may “outlive” the webpage that initiated it.
      const r = await fetch(url, { method: 'GET', mode: 'cors', keepalive: true })

      const responseData = (await r.json()) as FictionClientResponse

      return responseData
    }
    else { return { status: 'error', message: 'no response' } }
  }

  createTrackingEvent(eventData: TrackingEventUserDefined): TrackingEvent {
    const fullEventData = deepMerge([
      baseBrowserEvent({
        library: 'client',
        orgId: this.orgId,
        siteId: this.siteId,
        anonymousId: this.anonymousId,
      }),
      eventData,
      { sentAt: dayjs().toISOString(), messageId: objectId(), gen: this.gen },
    ]) as TrackingEvent

    return fullEventData
  }

  event(userEvent: TrackingEventUserDefined, options?: ClientRequestOptions): Promise<FictionClientResponse> | FictionClientResponse {
    const { sync = false } = options || {}

    const fullEventData = this.createTrackingEvent(userEvent)

    this.emit('event', fullEventData, options)

    emitEvent('TrackingEvent', fullEventData)

    if (sync) {
      this.add(fullEventData)
      return { status: 'success' }
    }
    else {
      return this.transmit({ events: [fullEventData] })
    }
  }

  public async identify(
    traits: Partial<IdentifyTraitsUser>,
    options?: ClientRequestOptions,
  ): Promise<FictionClientResponse>
  public async identify(
    userId: string,
    traits?: Partial<IdentifyTraitsUser>,
    options?: ClientRequestOptions,
  ): Promise<FictionClientResponse>
  public async identify(
    userId: unknown,
    traits?: unknown,
    options?: ClientRequestOptions,
  ): Promise<FictionClientResponse> {
    let _userId = ''
    let _options: ClientRequestOptions = {}
    let _traits: Partial<IdentifyTraitsUser> = {}
    if (typeof userId === 'string') {
      _traits = traits as Partial<IdentifyTraitsUser>
      _userId = userId
      _options = options as ClientRequestOptions
    }
    else {
      _traits = userId as Partial<IdentifyTraitsUser>
      _options = traits as ClientRequestOptions
      _userId = _traits.userId ?? ''
    }

    const { sync = false } = _options || {}
    const r = await this.event(
      {
        event: 'identify',
        type: 'identify',
        userId: _userId,
        traits: _traits as ClientRequestOptions,
      },
      { sync },
    )

    return r
  }

  public async group(
    groupId: string,
    traits?: Partial<IdentifyTraitsUser>,
    options?: ClientRequestOptions,
  ): Promise<FictionClientResponse | void> {
    const { sync = false } = options || {}
    const r = await this.event({ event: 'group', type: 'group', groupId, traits }, { sync })

    return r
  }

  public async track(
    event: string,
    properties?: Partial<TrackingProperties>,
    options?: ClientRequestOptions,
  ): Promise<FictionClientResponse | void> {
    const { sync = true } = options || {}
    const r = await this.event({ type: 'track', event, properties }, { sync })

    return r
  }

  public async capture(
    userEvent: TrackingEventUserDefined,
    options?: ClientRequestOptions,
  ): Promise<FictionClientResponse | void> {
    const { sync = true } = options || {}
    const r = await this.event(userEvent, { sync })

    return r
  }

  public async page(
    properties?: Partial<TrackingProperties>,
    options?: ClientRequestOptions,
  ): Promise<FictionClientResponse | void> {
    const { sync = true } = options || {}
    const r = await this.event(
      { type: 'page', event: 'view', properties },
      { sync },
    )

    return r
  }

  public async debug(
    message: string,
    properties?: Partial<TrackingProperties>,
  ): Promise<FictionClientResponse | void> {
    const r = await this.track('debug', { message, properties })

    const fullEventData = this.createTrackingEvent({
      event: 'debug',
      type: 'debug',
      properties,
    })

    this.transmitSync({ events: [fullEventData], endpoint: '/debug' })

    return r
  }
}
