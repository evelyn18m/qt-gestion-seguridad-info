export default defineNuxtPlugin(() => {
  const router = useRouter()

  router.afterEach((to) => {
    // Fire-and-forget: audit page visit (spec R2.1, R2.2)
    void $fetch('/api/audit/page-visit', {
      method: 'POST',
      body: { path: to.path },
    }).catch((e: unknown) => {
      console.error('[audit] page-visit event failed silently', e)
    })
  })
})
