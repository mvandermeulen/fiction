<script setup lang="ts">
import type { Card } from '@fiction/site/card'
import { type ListItem, log, useService, vue } from '@fiction/core'
import ElInput from '@fiction/ui/inputs/ElInput.vue'
import CardButton from '@fiction/cards/CardButton.vue'
import type { FictionSubscribe } from '..'
import { csvToEmailList, parseAndValidateEmails } from './utils'

const props = defineProps({
  card: { type: Object as vue.PropType<Card>, required: true },
})

const logger = log.contextLogger('ImportFile')

const service = useService<{ fictionSubscribe: FictionSubscribe }>()

const loading = vue.ref(false)
const draggingOver = vue.ref()
const fileList = vue.shallowRef<FileList>()
const importMethod = vue.ref<'csv' | 'text'>('text')
const step = vue.ref<'import' | 'submit'>('import')
const rawTextEmailList = vue.ref<string>()
const csvEmailList = vue.ref<string[]>([])
async function uploadFiles() {
  const files = fileList.value

  loading.value = true

  const file = files?.[0]

  if (!file)
    return

  try {
    loading.value = true
    csvEmailList.value = await csvToEmailList(file)
    logger.info(`upload result`, { data: csvEmailList.value })

    fileList.value = undefined

    step.value = 'submit'
  }
  catch (error) {
    logger.error(`upload error`, { error })
  }
  finally {
    loading.value = false
  }
}

async function handleUploadFile(ev: Event) {
  const target = ev.target as HTMLInputElement
  fileList.value = target.files || undefined
  uploadFiles()
}
async function handleDropFile(ev: Event) {
  const event = ev as DragEvent
  fileList.value = event.dataTransfer?.files || undefined
  uploadFiles()
}

const emailList = vue.computed(() => importMethod.value === 'text' ? parseAndValidateEmails(rawTextEmailList.value) : csvEmailList.value)

function prepareSubmit() {
  step.value = 'submit'
}

const info = vue.computed<ListItem[]>(() => {
  return [
    { name: 'Emails to Import', value: emailList.value.length },
    { name: 'Email Addresses', value: emailList.value.slice(0, 10).join(', ') || 'None' },
  ]
})

async function importSubscribers() {
  loading.value = true
  try {
    const subscribers = emailList.value.map(email => ({ email }))
    const orgId = service.fictionUser.activeOrgId.value

    if (!orgId) {
      logger.error(`no orgId`)
      return
    }

    const r = await service.fictionSubscribe.requests.ManageSubscription.projectRequest({ _action: 'bulkCreate', subscribers })

    if (r.status === 'success') {
      const changedCount = r.indexMeta?.changedCount || 0
      service.fictionEnv.events.emit('notify', {
        type: 'success',
        message: `${changedCount} Subscribers imported successfully`,
      })

      csvEmailList.value = []
      rawTextEmailList.value = ''
    }

    logger.info(`imported subscribers`, { data: emailList.value })
    step.value = 'import'
  }
  catch (error) {
    logger.error(`import error`, { error })
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[40dvh] p-16 ">
    <transition
      enter-active-class="ease-out duration-300"
      enter-from-class="opacity-0 -translate-x-12"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="ease-in duration-300"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-12"
      mode="out-in"
    >
      <div v-if="step === 'submit'" class="space-y-6">
        <ElInput label="Review Information" sub-label="Here is what we'll be importing...">
          <div class="p-8 rounded-md border border-theme-200 space-y-4">
            <div v-for="(item, i) in info" :key="i" class="flex flex-col ">
              <div class="text-theme-500 font-normal text-sm">
                {{ item.name }}
              </div>
              <div class="font-semibold text-xl">
                {{ item.value }}
              </div>
            </div>
          </div>
        </ElInput>

        <div class="flex gap-4 justify-between">
          <CardButton
            :card
            data-test-id="submit"
            theme="primary"
            type="submit"
            icon-after="i-tabler-upload"
            :loading="loading"
            @click="importSubscribers()"
          >
            Import Subscribers
          </CardButton>
          <CardButton :card theme="default" type="submit" icon="i-tabler-x" @click="step = 'import'">
            Cancel
          </CardButton>
        </div>
      </div>
      <div v-else class="space-y-6" @dragover.prevent @drop.prevent>
        <ElInput
          v-model="importMethod"
          label="Import Method"
          input="InputSelectCustom"
          :list="[
            { name: 'Upload a CSV file', value: 'csv' },
            { name: 'Copy and Paste Email Addresses', value: 'text' },
          ]"
          default-text="Select Import Method"
        />

        <transition
          enter-active-class="ease-out duration-300"
          enter-from-class="opacity-0 -translate-x-12"
          enter-to-class="opacity-100 translate-x-0"
          leave-active-class="ease-in duration-300"
          leave-from-class="opacity-100 translate-x-0"
          leave-to-class="opacity-0 translate-x-12"
          mode="out-in"
        >
          <ElInput
            v-if="importMethod === 'text'"
            v-model="rawTextEmailList"
            input="InputTextarea"
            label="Enter Email Addresses"
            sub-label="Separate each email address with a comma or new line"
            :rows="10"
            placeholder="email1@example.com,email2@example.com"
          />

          <ElInput
            v-else
            label="Upload Subscribers via CSV File"
            ui-size="lg"
            @drop="handleDropFile"
            @dragover="draggingOver = true"
            @dragleave="draggingOver = false"
          >
            <label for="file-upload" class="cursor-pointer mt-2 flex justify-center rounded-lg border border-dashed border-theme-300 dark:border-theme-600 hover:border-theme-400 dark:hover:border-theme-500 hover:bg-theme-50 dark:hover:bg-theme-700 px-6 py-10">
              <div class="text-center">
                <div class="text-5xl i-tabler-file-type-csv text-theme-300" />
                <div class="mt-4 flex text-sm leading-6 text-theme-600">
                  <div class="relative cursor-pointer rounded-md  font-semibold text-primary-500 dark:text-primary-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2 hover:text-primary-500">
                    <span>Upload a file</span>
                  </div>
                  <p class="pl-1">
                    Click to upload or drag and drop
                  </p>
                </div>
                <p class="text-xs text-theme-500">
                  CSV Files only - 20k Rows Max
                </p>
              </div>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                class="sr-only"
                accept=".csv,text/csv"
                @change="(_) => handleUploadFile(_)"
              >
            </label>
          </ElInput>
        </transition>
        <div>
          <CardButton
            :card
            :disabled="!emailList.length"
            data-test-id="save"
            theme="primary"
            type="submit"
            icon-after="i-tabler-arrow-right"
            :loading="loading"
            @click.prevent="prepareSubmit()"
          >
            Next
          </CardButton>
        </div>
      </div>
    </transition>
  </div>
</template>
