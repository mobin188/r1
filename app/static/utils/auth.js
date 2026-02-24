const formLocks = new WeakMap()

export function withSubmitLock(form, handler) {
    return async (e) => {
        e.preventDefault()

        if (formLocks.get(form)) return

        const controller = new AbortController()
        formLocks.set(form, controller)

        try {
            await handler(e, controller.signal)
        } finally {
            formLocks.delete(form)
        }
    }
}

export function saveUserData(token, username) {
    localStorage.setItem("token", token)
    localStorage.setItem("username", username)
}

export function getToken() {
    return localStorage.getItem("token")
}

export function redirectIfAuthenticated(path = "/articles") {
    if (getToken()) {
        window.location.href = path
    }
}

export function redirectIfNotAuthenticated(path = "/login") {
  if (!getToken()) {
    window.location.href = path
  }
}

export function logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("username")
    window.location.href = "/login"
}