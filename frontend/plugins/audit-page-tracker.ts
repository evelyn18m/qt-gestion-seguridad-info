export default defineNuxtPlugin(() => {
  const router = useRouter()

  router.afterEach((to) => {
    const token = import.meta.client
      ? sessionStorage.getItem('auth_token')
      : null

    // Fire-and-forget: audit page visit (spec R2.1, R2.2)
    void $fetch('/api/audit/page-visit', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: { path: to.path },
    }).catch((e: unknown) => {
      console.error('[audit] page-visit event failed silently', e)
    })
  })
})
