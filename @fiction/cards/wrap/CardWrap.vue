<script lang="ts" setup>
import { vue, waitFor } from '@fiction/core'
import type { Card } from '@fiction/site/card'
import ElEngine from '../CardEngine.vue'
import type { UserConfig } from './index.js'

defineProps({
  card: { type: Object as vue.PropType<Card<UserConfig>>, required: true },
})

/**
 * Delay the footer to show after a short delay.
 * This is to prevent the footer from showing before the main content.
 */
const showDelayed = vue.ref(true)
vue.onMounted(async () => {
  await waitFor(700)
  showDelayed.value = false
})
</script>

<template>
  <div v-if="card.site">
    <ElEngine
      tag="header"
      :card="card.site.sections.value.header"
      :class="card.userConfig.value.fixedHeader ? 'fixed w-full top-0 z-10' : ''"
    />
    <ElEngine tag="main" :card="card" />
    <ElEngine class="transition-all duration-700" :class="showDelayed ? 'opacity-0' : 'opacity-100'" tag="footer" :card="card.site.sections.value.footer" />
    <ElEngine class="hidden" :card="card.site.sections.value.hidden" />
  </div>
</template>
