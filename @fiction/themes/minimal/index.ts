import type { FictionEnv } from '@fiction/core'
import { safeDirname } from '@fiction/core'
import { Theme, createCard } from '@fiction/site/theme.js'
import { templates } from './templates.js'

function pages() {
  return [
    createCard({
      templates,
      regionId: 'main',
      templateId: 'wrap',
      slug: '_home',
      title: 'Home',
      isHome: true,
      cards: [
        createCard({ templates, templateId: 'profile', userConfig: { } }),
      ],
    }),
    createCard({
      templates,
      regionId: 'main',
      templateId: 'wrap',
      slug: 'contact',
      title: 'Contact',
      cards: [
        createCard({ templates, templateId: 'map', userConfig: { } }),
      ],
    }),
  ]
}

export async function setup(args: { fictionEnv: FictionEnv }) {
  const { fictionEnv } = args
  return new Theme({
    fictionEnv,
    root: safeDirname(import.meta.url),
    themeId: 'minimal',
    title: 'Minimal',
    description: 'Minimal personal branding theme',
    screenshot: new URL('./img/screenshot.jpg', import.meta.url).href,
    version: '1.0.0',
    templates,
    isPublic: true,
    pages: () => pages(),
    userConfig: { },

    sections: () => {
      return {
        header: createCard({
          templates,
          regionId: 'header',
          templateId: 'area',
          cards: [createCard({ templates, templateId: 'minimalHeader' })],
        }),
        footer: createCard({
          templates,
          regionId: 'footer',
          templateId: 'area',
          cards: [createCard({ templates, templateId: 'minimalFooter' })],
        }),
      }
    },
  })
}
