<template>
  <div
    v-if="authLoading"
    class="loading-veil fixed top-0 left-0 flex h-full w-full items-center justify-center bg-white text-slate-300"
  >
    <ElSpinner class="h-12 w-12" />
  </div>
</template>

<script lang="ts" setup>
import { FactorUser, FactorRouter, vue } from "@factor/api"
import ElSpinner from "./ElSpinner.vue"
const props = defineProps({
  factorUser: {
    type: Object as vue.PropType<FactorUser>,
    required: true,
  },
  factorRouter: {
    type: Object as vue.PropType<FactorRouter>,
    required: true,
  },
})
const authLoading = vue.ref(false)

if (props.factorRouter.routeRequiresAuth()) {
  authLoading.value = true
}
vue.onMounted(async () => {
  await props.factorUser.userInitialized()
  authLoading.value = false
})
</script>
<style lang="less" scoped>
.loading-veil {
  z-index: 10000;
}
</style>
