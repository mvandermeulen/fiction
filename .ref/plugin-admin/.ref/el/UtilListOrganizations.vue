<script lang="ts" setup>
import type { FactorRouter, FactorUser } from '@factor/api'
import { useService, vue } from '@factor/api'
import type { TableCell } from '@factor/ui/ElTable.vue'
import ElTable from '@factor/ui/ElTable.vue'

const { factorRouter, factorUser } = useService<{
  factorRouter: FactorRouter
  factorUser: FactorUser
}>()

const activeOrganizations = factorUser.activeOrganizations
const formattedData = vue.computed(() => {
  if (!activeOrganizations.value)
    return []
  const rows = activeOrganizations.value.map((org) => {
    const memberAccess = org.relation?.memberAccess
    const canManage = factorUser.priv.userCan({
      capability: 'canManage',
      memberAccess,
    })
    return [
      org.orgId,
      org.orgName,
      canManage ? org.members.length : '-',
      memberAccess,
      canManage
        ? ({
            type: 'link',
            text: 'Settings',
            path: (orgId: string) =>
              factorRouter.link('orgSettings', { orgId }).value || '',
          } as const)
        : ({
            type: 'callback',
            text: 'Leave',
            callback: (_orgId: string) => {
              const _confirmed = confirm(
                'Are you sure you want to leave this organization?',
              )
              // TODO
            },
          } as const),
    ]
  })
  const r = [['', 'Name', 'Members', 'Relation', ''], ...rows] as TableCell[][]

  return r
})

async function handleRowClick(orgId: string) {
  const makeActive = activeOrganizations.value.find(
    o => orgId === o.orgId,
  )
  if (makeActive)
    await factorRouter.goto('adminNaked', { orgId })
}
</script>

<template>
  <ElTable
    :table="formattedData"
    :on-row-click="handleRowClick"
    :empty="{
      title: 'No organizations found',
      description: 'Create one to get started',
    }"
  />
</template>
