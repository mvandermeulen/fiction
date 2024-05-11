import { colorList, colorTheme, deepMerge, safeDirname, vue } from '@fiction/core'
import { CardTemplate, createCard } from '@fiction/site'
import { InputOption } from '@fiction/ui'
import { z } from 'zod'

const SchemeSchema = z.object({
  bg: z.object({
    color: z.string().optional(),
    gradient: z.object({
      angle: z.number().optional(),
      stops: z.array(z.object({
        color: z.string(),
        percent: z.number().optional(),
      })).optional(),
    }).optional(),
  }),
  theme: z.enum(colorTheme).optional(),
})

const UserConfigSchema = z.object({
  scheme: z.object({
    reverse: z.boolean().optional(),
    light: SchemeSchema.optional(),
    dark: SchemeSchema.optional(),
  }).optional(),
})

export type UserConfig = z.infer<typeof UserConfigSchema>

const templateId = 'area'
export const templates = [
  new CardTemplate({
    root: safeDirname(import.meta.url),
    templateId,
    category: ['basic'],
    description: 'container for other elements',
    icon: 'i-tabler-box-padding',
    colorTheme: 'blue',
    el: vue.defineAsyncComponent(() => import('./ElArea.vue')),
    isContainer: true, // ui drawer
    userConfig: {
      spacing: { spacingClass: '' },
    },
    isPublic: true,
    options: [
      new InputOption({ key: 'scheme.reverse', label: 'Flip Color Scheme', input: 'InputToggle' }),
      new InputOption({ key: 'scheme.light', label: 'Light Mode', input: 'group', options: [
        new InputOption({ key: 'scheme.light.bg.color', label: 'Light Mode Color', input: 'InputColor' }),
        new InputOption({ key: 'scheme.light.theme', label: 'Light Color Theme', input: 'InputSelect', props: { list: colorTheme } }),
        new InputOption({ key: 'scheme.light.bg.gradient', label: 'Light Mode Gradient', input: 'InputGradient' }),
      ] }),
      new InputOption({ key: 'scheme.dark', label: 'Dark Mode', input: 'group', options: [
        new InputOption({ key: 'scheme.dark.bg.color', label: 'Dark Mode Color', input: 'InputColor' }),
        new InputOption({ key: 'scheme.dark.theme', label: 'Dark Color Theme', input: 'InputSelect', props: { list: colorTheme } }),
        new InputOption({ key: 'scheme.dark.bg.gradient', label: 'Dark Mode Gradient', input: 'InputGradient' }),
      ] }),
    ],
    schema: UserConfigSchema,
  }),
] as const

export function demo() {
  const heroCard = (reverse?: boolean) => {
    return {
      templateId: 'hero',
      userConfig: {
        heading: `Area ${reverse ? '(Reversed)' : ''}`,
        subHeading: 'Container for other elements',
        mediaItems: [{
          media: { format: 'url', url: 'https://via.placeholder.com/800x400' },
        }],
      },
    }
  }
  const base = {
    scheme: {
      reverse: false,
      light: { bg: { color: '#bfdbfe' }, theme: 'blue' },
      dark: { bg: { color: '#1e3a8a' }, theme: 'blue' },
    },
  } as const
  return createCard({
    slug: `card-${templateId}`,
    cards: [
      createCard({ templateId, templates, userConfig: base, cards: [heroCard()] }),
      createCard({ templateId, templates, userConfig: deepMerge([base, { scheme: { reverse: true } }]), cards: [heroCard(true)] }),
    ],
  })
}
