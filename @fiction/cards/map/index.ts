import { vue } from '@fiction/core'
import { CardTemplate } from '@fiction/site'
import { z } from 'zod'
import { InputOption } from '@fiction/ui'
import { standardOption } from '../inputSets'

const templateId = 'maps'

// Define schema for the markers within the maps array
const markerSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  label: z.string().optional(),
})
const mapStyles = [
  'satellite',
  'streets',
  'outdoors',
  'light',
  'dark',
  'satellite',
  'satellite-streets',
  'mode',
  'navigation-night',
] as const

// Define the schema for maps as used in UserConfig
export const mapSchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
  zoom: z.number().optional(),
  pitch: z.number().optional(),
  markers: z.array(markerSchema).optional(),
  mapStyle: z.enum(mapStyles).optional(),
})

export type MapSchemaConfig = z.infer<typeof mapSchema>

const UserConfigSchema = z.object({
  maps: z.array(mapSchema).optional(),
})

export type UserConfig = z.infer<typeof UserConfigSchema>

const mapBase = {
  lat: 33.652199,
  lng: -117.747719,
  zoom: 13,
  markers: [{ lat: 33.652199, lng: -117.747719, label: 'Headquarters' }],
  mapStyle: 'streets' as const,
}

export const templates = [
  new CardTemplate({
    templateId,
    category: ['advanced'],
    description: 'map with markers, powered by Mapbox',
    icon: 'i-tabler-map',
    colorTheme: 'amber',
    isPublic: true,
    el: vue.defineAsyncComponent(async () => import('./ElCard.vue')),
    options: [

      standardOption.inputList({ label: 'Maps', key: 'maps', options: [
        new InputOption({ key: 'lat', label: 'Latitude', input: 'InputNumber' }),
        new InputOption({ key: 'lng', label: 'Longitude', input: 'InputNumber' }),
        new InputOption({ key: 'zoom', label: 'Zoom', input: 'InputRange', props: { min: 1, max: 20 } }),
        new InputOption({ key: 'pitch', label: 'Pitch', input: 'InputRange', props: { min: 0, max: 100 } }),
        new InputOption({ key: 'mapStyle', label: 'Map Style', input: 'InputSelect', props: { list: mapStyles } }),
        standardOption.inputList({ label: 'Markers', key: 'markers', options: [
          new InputOption({ key: 'lat', label: 'Latitude', input: 'InputNumber' }),
          new InputOption({ key: 'lng', label: 'Longitude', input: 'InputNumber' }),
          new InputOption({ key: 'label', label: 'Label', input: 'InputText' }),
        ] }),
      ] }),
    ],
    getBaseConfig: () => ({ standard: { spacing: { verticalSpacing: 'sm' } } }),
    getUserConfig: () => ({ maps: [mapBase] }),
    schema: UserConfigSchema,
    demoPage: async () => {
      return {
        cards: [
          { templateId, userConfig: { maps: [
            mapBase,
            { ...mapBase, zoom: 15, pitch: 70, mapStyle: 'navigation-night' as const },
            { ...mapBase, zoom: 10, pitch: 60 },
            { ...mapBase, zoom: 15, pitch: 70, mapStyle: 'mode' as const },

          ] } },
          { templateId, userConfig: { maps: [{ ...mapBase, mapStyle: 'dark' as const }] } },
          { templateId, userConfig: { maps: [{ ...mapBase, mapStyle: 'outdoors' as const }] } },
          { templateId, userConfig: { maps: [{ ...mapBase, mapStyle: 'mode' as const, markers: [
            { lat: 33.652199, lng: -117.747719, label: 'Some longer text goes here, what do you think' },
            { lat: 33.632199, lng: -117.747719, label: 'more text goes here, what do you think about all that' },
          ] }] } },
        ],
      }
    },
  }),
] as const
