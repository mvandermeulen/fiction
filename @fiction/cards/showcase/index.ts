import type { PostItem } from '@fiction/core'
import { vue } from '@fiction/core'
import type { Site } from '@fiction/site'
import { CardTemplate } from '@fiction/site'
import { z } from 'zod'
import { InputOption } from '@fiction/ui'
import { standardOption } from '../inputSets'
import { stockMediaHandler } from '../stock/index.js'

const el = vue.defineAsyncComponent(async () => import('./ElShowcase.vue'))
const aspects = ['square', 'tall', 'wide', 'golden', 'portrait', 'landscape', 'cinema'] as const
const gridCols = ['1', '2', '3', '4', '5'] as const
const UserConfigSchema = z.object({
  items: z.array(z.object({
    content: z.string().optional(),
    title: z.string().optional(),
    subTitle: z.string().optional(),
    superTitle: z.string().optional(),
    media: z.object({
      format: z.enum(['url', 'html', 'video', 'image']).optional(),
      url: z.string().optional(),
      html: z.string().optional(),
    }),
  }) as z.Schema<PostItem>).optional(),
  aspect: z.enum(aspects).optional().describe('Image aspect ratio'),
  gridColsMax: z.enum(gridCols).optional().describe('Max number of columns in the grid on large screen'),
  gridColsMin: z.enum(['1', '2']).optional().describe('Min number of columns in the grid on small screen'),
})

export type UserConfig = z.infer<typeof UserConfigSchema>

export async function getDefaultConfig(): Promise<UserConfig> {
  return {
    aspect: 'portrait',
    gridColsMax: '4',
    items: [
      {
        title: 'Item 1',
        subTitle: 'Lorem ipsum dolor sit amet',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        media: stockMediaHandler.getRandomByTags(['aspect:portrait', 'object']),
      },
      {
        title: 'Item 2',
        subTitle: 'Consectetur adipiscing elit',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        media: stockMediaHandler.getRandomByTags(['aspect:portrait', 'object']),
      },
      {
        title: 'Item 3',
        subTitle: 'Sed do eiusmod tempor',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        media: stockMediaHandler.getRandomByTags(['aspect:portrait', 'object']),
      },
      {
        title: 'Item 4',
        subTitle: 'Incididunt ut labore et dolore',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        media: stockMediaHandler.getRandomByTags(['aspect:portrait', 'object']),
      },
      {
        title: 'Item 5',
        subTitle: 'Magna aliqua ut enim',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        media: stockMediaHandler.getRandomByTags(['aspect:portrait', 'object']),
      },
      {
        title: 'Item 6',
        subTitle: 'Ad minim veniam quis',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        media: stockMediaHandler.getRandomByTags(['aspect:portrait', 'object']),
      },
      {
        title: 'Item 7',
        subTitle: 'Nostrud exercitation ullamco',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        media: stockMediaHandler.getRandomByTags(['aspect:portrait', 'object']),
      },
      {
        title: 'Item 8',
        subTitle: 'Laboris nisi ut aliquip',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        media: stockMediaHandler.getRandomByTags(['aspect:portrait', 'object']),
      },
      {
        title: 'Item 9',
        subTitle: 'Ex ea commodo consequat',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        media: stockMediaHandler.getRandomByTags(['aspect:portrait', 'object']),
      },
      {
        title: 'Item 10',
        subTitle: 'Duis aute irure dolor',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        media: stockMediaHandler.getRandomByTags(['aspect:portrait', 'object']),
      },
      {
        title: 'Item 11',
        subTitle: 'In reprehenderit in voluptate',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        media: stockMediaHandler.getRandomByTags(['aspect:portrait', 'object']),
      },
      {
        title: 'Item 12',
        subTitle: 'Velit esse cillum dolore',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        media: stockMediaHandler.getRandomByTags(['aspect:portrait', 'object']),
      },
      {
        title: 'Item 13',
        subTitle: 'Eu fugiat nulla pariatur',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        media: stockMediaHandler.getRandomByTags(['aspect:portrait', 'object']),
      },
    ],
  }
}

const templateId = 'showcase'
const template = new CardTemplate({
  templateId,
  category: ['portfolio'],
  description: 'Showcase grid of items with popup details',
  icon: 'i-tabler-carousel-horizontal',
  colorTheme: 'pink',
  isPublic: true,
  el,
  options: [
    standardOption.postItems({ key: 'items', label: 'Showcase Items' }),
    new InputOption({ key: 'aspect', label: 'Image Aspect', input: 'InputSelect', list: aspects, default: () => 'golden' }),
    new InputOption({ key: 'gridColsMax', label: 'Max Grid Columns', input: 'InputSelect', list: gridCols, default: () => '4' }),
    new InputOption({ key: 'gridColsMin', label: 'Min Grid Columns', input: 'InputSelect', list: ['1', '2'], default: () => '1' }),
  ],
  getUserConfig: () => getDefaultConfig(),
  schema: UserConfigSchema,
  demoPage: async () => {
    const userConfig = await getDefaultConfig()
    return { cards: [{ templateId, userConfig }] }
  },
})

export const templates = [template] as const
