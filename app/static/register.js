"use strict"

import {config} from "./utils/config.js"
// auth management
import {withSubmitLock, saveUserData, redirectIfAuthenticated} from "./utils/auth.js"

// import components
// import "./component/globalStyles.mjs"

import "./component/input.mjs"
// customElements.define("component-input", Input)

import "./component/button.mjs"
// customElements.define("component-button", Button)


// sign up flow
const formSignup = document.getElementById("formSignup")
const submitButton = formSignup.querySelector('component-button[type="submit"]')

redirectIfAuthenticated()

formSignup.addEventListener("submit", withSubmitLock(formSignup, async (_, signal) => {
    try {
        const inputs = formSignup.querySelectorAll("component-input")

        // for (const input of inputs) {
        //     if (!input.checkValidity()) {
        //         throw input.message("error", input.validationMessage)
        //     }
        // }
        let hasError = false
        for (const input of inputs) {
            if (!input.checkValidity()) {
                input.message("error", input.validationMessage)
                hasError = true
            }
        }
        if (hasError) return

        submitButton.setAttribute("loading", "")

        const username = formSignup.querySelector('component-input[label="Username"]').value.trim()
        const email = formSignup.querySelector('component-input[label="Email"]').value.trim()
        const password = formSignup.querySelector('component-input[label="Password"]').value.trim()

        const response = await fetch(`${config.API_BASE}/users`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({user: {username, email, password}}),
            signal
        })

        const result = await response.json()

        if (!response.ok) {
            const errors = result.errors || {}
            if (errors.username) formSignup.querySelector('component-input[label="Username"]').message("error", errors.username[0])
            if (errors.email) formSignup.querySelector('component-input[label="Email"]').message("error", errors.email[0])
            if (errors.password) formSignup.querySelector('component-input[label="Password"]').message("error", errors.password[0])

            return
        }

        saveUserData(result.user.token, result.user.username)
        window.location.href = "/articles"
    } finally {
        submitButton.removeAttribute("loading")
    }
}))