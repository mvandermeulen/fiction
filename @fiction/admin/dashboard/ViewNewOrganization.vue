<script lang="ts" setup>
import type { Card } from '@fiction/site/card'
import { useService, vue, vueRouter } from '@fiction/core'
import ElInput from '@fiction/ui/inputs/ElInput.vue'
import ElForm from '@fiction/ui/inputs/ElForm.vue'
import type { NavCardUserConfig } from '../index.js'
import ElPanelSettings from './ElPanelSettings.vue'

const props = defineProps({
  card: { type: Object as vue.PropType<Card<NavCardUserConfig>>, required: true },
})

const { fictionUser } = useService()

const router = vueRouter.useRouter()
const form = vue.ref({
  orgName: '',
  orgEmail: '',
})
const formError = vue.ref('')
const sending = vue.ref(false)

vue.onMounted(async () => {
  await fictionUser.userInitialized({ caller: 'ViewNewOrganization' })
})

async function send(): Promise<void> {
  sending.value = true

  const { orgName, orgEmail } = form.value

  const userId = fictionUser.activeUser.value?.userId

  if (!userId)
    throw new Error('userId is missing')

  const r = await fictionUser.requests.ManageOrganization.request({
    userId,
    fields: { orgName, orgEmail },
    _action: 'create',
  })

  if (r.status === 'success') {
    const orgId = r.data?.orgId
    await router.push(props.card.link(`/settings/team-invite?orgId=${orgId}`))
  }
  sending.value = false
}
</script>

<template>
  <ElPanelSettings title="Create Organization">
    <div class="max-w-xl">
      <ElForm
        :notify="formError"
        class="space-y-8"
        @submit="send()"
      >
        <ElInput
          v-model="form.orgName"
          input="InputText"
          label="Organization Name"
          placeholder="My Organization"
          sub-label="You can change this later"
          required
        />

        <ElInput
          v-model="form.orgEmail"
          input="InputEmail"
          label="Primary Organization Email"
          sub-label="Used for notifications and billing"
          placeholder="example@org.com"
          required
        />

        <ElInput input="InputSubmit">
          Create New Organization
        </ElInput>
      </ElForm>
    </div>
  </ElPanelSettings>
</template>
