<script lang="ts" setup>
import ElInput from '@factor/ui/ElInput.vue'
import ElButton from '@factor/ui/ElButton.vue'
import ElAvatar from '@factor/ui/ElAvatar.vue'
import type { Organization, UserMeta } from '@factor/api'
import { emitEvent, useService, vue } from '@factor/api'
import ElPanelSettings from './ElPanelSettings.vue'
import UtilDeleteOrg from './UtilDeleteOrg.vue'
import UtilListOrganizations from './UtilListOrganizations.vue'

const { factorRouter, factorUser } = useService()

const form = vue.ref<Partial<Organization>>({})
const defaultConfig = { disableWatermark: false, serverTimeoutMinutes: 20 }
const config = vue.ref<{ serverTimeoutMinutes?: number, disableWatermark?: boolean }>(defaultConfig)
const meta = vue.ref<Partial<UserMeta>>({})
const sending = vue.ref<string | boolean>(false)
const sent = vue.ref(false)

const orgId = vue.computed<string>(
  () => factorRouter.current.value.params.orgId as string,
)

const org = vue.computed<Organization | undefined>(() => {
  const org = factorUser.activeOrganizations.value.find(
    _ => _.orgId === orgId.value,
  )
  return org
})

async function saveOrganization(): Promise<void> {
  if (!form.value.orgId)
    throw new Error('No organization id')

  const fields = { ...form.value, meta: meta.value, config: config.value }

  await factorUser.requests.ManageOrganization.request(
    {
      _action: 'update',
      orgId: form.value.orgId,
      org: fields,
    },
    { debug: true },
  )
}

async function send(context: string): Promise<void> {
  sending.value = context

  await saveOrganization()
  sent.value = true
  sending.value = false
}

vue.onMounted(async () => {
  await factorUser.userInitialized()

  if (org.value) {
    form.value = org.value
    config.value = { ...defaultConfig, ...org.value.config }
  }
  else {
    emitEvent('notifyError', `can't find that organization`)
    await factorRouter.push(factorRouter.link('orgIndex').value)
  }
})

vue.onMounted(async () => {
  await factorUser.userInitialized()
  vue.watch(
    () => factorUser.activeOrganization.value,
    (v) => {
      if (v) {
        form.value = v
        meta.value = v.meta ?? {}
      }
    },
    { immediate: true },
  )
})
</script>

<template>
  <div class=" ">
    <ElPanelSettings title="Organization Settings">
      <div class="space-y-12">
        <div class="flex items-center space-x-4">
          <div>
            <ElAvatar
              :email="factorUser.activeOrganization.value?.orgEmail"
              class="h-16 w-16 rounded-full"
            />
          </div>
          <div>
            <div class="font-brand text-4xl font-bold">
              {{ factorUser.activeOrganization.value?.orgName }}
            </div>
            <div class="text-theme-500 font-medium">
              billing email:
              {{ factorUser.activeOrganization.value?.orgEmail }}
              &middot; you are an
              <span class="">{{
                factorUser.activeOrganization.value?.relation?.memberAccess
              }}</span>
            </div>
          </div>
        </div>
        <div class="space-y-6">
          <div class="max-w-md space-y-6">
            <ElInput
              v-model="form.orgName"
              input="InputText"
              label="Organization Name"
              required
              @keyup.enter.stop="emitEvent('submit')"
            />

            <ElInput
              v-model="form.orgEmail"
              input="InputText"
              label="Organization Email"
              sub-label="Used for billing, notifications, avatar"
              placeholder="billing@example.com"
              @keyup.enter.stop="emitEvent('submit')"
            />

            <ElInput
              v-model="form.username"
              input="InputText"
              label="Username"
              placeholder="acme-inc"
              sub-label="Used in public profiles, must be unique."
            />
            <div>
              <ElButton
                btn="primary"
                size="sm"
                :loading="sending === 'settings'"
                @click="send('settings')"
              >
                Save Changes
              </ElButton>
            </div>
          </div>
        </div>
      </div>
    </ElPanelSettings>
    <ElPanelSettings
      title="Your Organizations"
      :actions="[
        { name: 'Create New Organization', href: factorRouter.link('settings', { itemId: 'newOrg' }).value },
      ]"
    >
      <UtilListOrganizations />
    </ElPanelSettings>
    <ElPanelSettings
      v-if="!factorUser.activeUser.value?.isSuperAdmin"
      title="Admin Only Settings"
    >
      <div class="space-y-12">
        <div class="space-y-4">
          <ElInput
            v-model="form.specialPlan"
            label="Special Plan"
            sub-label="Give this organization a special pricing plan"
            input="InputSelect"
            :list="[
              { name: 'none', value: '' },
              { name: 'VIP', value: 'vip' },
            ]"
          />

          <div>
            <ElButton
              btn="primary"
              size="sm"
              :loading="sending === 'admin'"
              @click="send('admin')"
            >
              Save Changes
            </ElButton>
          </div>
        </div>

        <UtilDeleteOrg />
      </div>
    </ElPanelSettings>
  </div>
</template>
