import { resetUi, getRouter } from "@factor/api"
import { watch } from "vue"
export const initializeWindow = async (): Promise<void> => {
  window.process.env = {}
  const router = getRouter()
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") resetUi()
  })
  window.addEventListener("click", () => resetUi())
  watch(
    () => router.currentRoute.value.path,
    (r, old) => {
      if (r != old) resetUi()
    },
  )
}
