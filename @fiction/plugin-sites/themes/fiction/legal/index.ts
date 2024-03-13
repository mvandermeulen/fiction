import type { NavGroup } from '@fiction/core'
import { templates } from '../templates'
import { createCard } from '../../../theme'
import * as PostPrivacy from './privacy.md'
import * as PostTerms from './terms.md'

const menu: NavGroup[] = [
  {
    title: 'Legal',
    items: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
    ],
  },
]

export const pages = [
  createCard({
    templates,
    regionId: 'main',
    templateId: 'doc',
    slug: 'privacy',
    userConfig: { menu, post: PostPrivacy },
  }),
  createCard({
    templates,
    regionId: 'main',
    templateId: 'doc',
    slug: 'terms',
    userConfig: { menu, post: PostTerms },
  }),
]
