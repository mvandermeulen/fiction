<script lang="ts" setup>
import type { StandardSize } from '@fiction/core'
import { vue } from '@fiction/core'
import { textInputClasses } from './theme'

defineProps({
  modelValue: { type: String, default: '' },
  inputClass: { type: String, default: '' },
  uiSize: { type: String as vue.PropType<StandardSize>, default: 'md' },
})
const emit = defineEmits<{
  (event: 'update:modelValue', payload: string): void
}>()
const attrs = vue.useAttrs() as { autocomplete: string, [key: string]: any }
function handleEmit(target: EventTarget | null): void {
  const el = target as HTMLInputElement

  emit('update:modelValue', el.value)
}
</script>

<template>
  <input
    :class="textInputClasses({ inputClass, uiSize })"
    :value="modelValue"
    :autocomplete="attrs.autocomplete || 'current-password'"
    type="password"
    minlength="6"
    placeholder="Password"
    @input="handleEmit($event.target)"
  >
</template>
