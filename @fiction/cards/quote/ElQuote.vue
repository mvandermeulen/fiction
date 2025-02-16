<script lang="ts" setup>
import { vue } from '@fiction/core'
import ElImage from '@fiction/ui/media/ElImage.vue'
import type { Card } from '@fiction/site'
import CardText from '../CardText.vue'
import NavDots from '../el/NavDots.vue'

import type { Quote, UserConfig } from '.'

const props = defineProps({
  card: { type: Object as vue.PropType<Card<UserConfig>>, required: true },
})

const uc = vue.computed(() => props.card.userConfig.value || {})
const quotes = vue.computed(() => uc.value.quotes?.length ? uc.value.quotes : [])

const hasAuthorImage = (quote: Quote) => quote?.author?.image?.url || quote?.author?.image?.html
const hasOrgImage = (quote: Quote) => quote?.org?.image?.url || quote?.org?.image?.html

const activeItem = vue.ref(0)
</script>

<template>
  <div class="mx-auto max-w-5xl px-6 lg:px-8">
    <div class="flex overflow-x-auto no-scrollbar snap-mandatory snap-x">
      <div v-for="(quote, i) in quotes" :key="i" class="slide shrink-0 w-full snap-center">
        <div v-if="hasOrgImage(quote) && quote?.org" class="org mb-6 md:text-center">
          <div data-test-id="org-image" class="relative inline-block dark:text-theme-0">
            <ElImage
              class="h-10 md:h-20 aspect-[2/1] object-contain"
              :media="quote.org.image"
              :alt="quote.org.name"
            />
          </div>
        </div>
        <div class="flex-col justify-center sm:text-balance">
          <div class="min-w-0 text-left sm:text-center text-4xl lg:text-6xl !leading-[1.2]">
            <CardText
              tag="span"
              :card="card"
              :path="`quotes.${i}.text`"
              animate="fade"
              prefix="&#8220;"
              suffix="&#8221;"
            />
          </div>
        </div>
        <div v-if="quote?.author?.name" class="mt-4 md:mt-8 flex items-center justify-start sm:justify-center gap-4 md:gap-8">
          <div
            v-if="hasAuthorImage(quote)"
            class="relative aspect-square h-10 md:h-14 overflow-hidden rounded-full dark:ring-2 dark:ring-theme-0 m-1"
          >
            <ElImage
              class="absolute h-full w-full object-cover"
              :media="quote.author.image"
            />
          </div>
          <div class="text-left  space-y-0.5" :class="hasAuthorImage(quote) ? 'text-left' : 'md:text-center'">
            <CardText :card="card" :path="`quotes.${i}.author.name`" class="text-lg md:text-3xl font-bold" animate="fade" />
            <CardText class="font-sans text-sm md:text-xl text-theme-500 dark:text-theme-400" :card="card" :path="`quotes.${i}.author.title`" animate="fade" />
          </div>
        </div>
      </div>
    </div>
    <NavDots v-model:active-item="activeItem" :container-id="card.cardId" :items="quotes" class="mt-12 z-20 mb-6" />
  </div>
</template>
