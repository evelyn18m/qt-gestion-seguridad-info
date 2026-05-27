export const useAuth = () => {
  const userToken = useState<string | null>('userToken', () => null)
  const userData = useState<any>('userData', () => null)
  const username = ref('')
  const password = ref('')
  const loading = ref(false)
  const error = ref('')

  const isLoggedIn = computed(() => !!userToken.value)

  async function login() {
    loading.value = true
    error.value = ''

    const params = new URLSearchParams()
    params.append('grant_type', 'password')
    params.append('client_id', 'sgsi-app')
    params.append('client_secret', '2AbmJS1ok5t52CKqUqUwoovk2wQDGWPC')
    params.append('username', username.value)
    params.append('password', password.value)

    try {
      const response = await fetch('http://localhost:8080/realms/quito-turismo/protocol/openid-connect/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error_description || 'Credenciales inválidas')
      }

      const data = await response.json()
      userToken.value = data.access_token
      userData.value = JSON.parse(atob(data.access_token.split('.')[1]))
    } catch (err: any) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  function logout() {
    userToken.value = null
    userData.value = null
    username.value = ''
    password.value = ''
  }

  return {
    userToken,
    userData,
    username,
    password,
    loading,
    error,
    isLoggedIn,
    login,
    logout,
  }
}
