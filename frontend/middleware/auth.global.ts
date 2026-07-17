export default defineNuxtRouteMiddleware((to) => {
    // 1. Skip check if the user is already going to the login page
    if (to.path === '/login') {
        return
    }

    // 2. Fetch your client-side auth state (Pinia store, composable, or cookie)
    const { loggedIn } = useAuth() // Replace with your actual auth hook

    // 3. Redirect to login if not authenticated
    if (!loggedIn.value) {
        return navigateTo('/login')
    }
})