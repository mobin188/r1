"use strict"

import {config} from "./utils/config.js"
import {withSubmitLock, saveUserData, redirectIfAuthenticated} from "./utils/auth.js"


// import components
// import "./component/globalStyles.mjs"

import {Toast} from "./component/toast.mjs"
// customElements.define("component-toast", Toast)

import {Input} from "./component/input.mjs"
// customElements.define("component-input", Input)

import {Button} from "./component/button.mjs"
// customElements.define("component-button", Button)


// login flow
const formLogin = document.getElementById("formLogin")
const toast = document.getElementById("toast")
const submitButton = formLogin.querySelector('component-button[type="submit"]')

redirectIfAuthenticated()

formLogin.addEventListener("submit", withSubmitLock(formLogin, async (_, signal) => {
    try {
        // validate user input
        const inputs = formLogin.querySelectorAll("component-input")

        let hasError = false
        for (const input of inputs) {
            if (!input.checkValidity()) {
                input.message("error", input.validationMessage)
                hasError = true
            }
        }
        if (hasError) return

        // put submit button component in a loading state, to avoid resubmitting during the process
        submitButton.setAttribute("loading", "")

        // input references
        const emailInput = formLogin.querySelector('component-input[name="email"]')
        const passwordInput = formLogin.querySelector('component-input[name="password"]')

        // input values
        const email = emailInput.value.trim()
        const password = passwordInput.value.trim()

        // make request to the server
        // const response = await fetch("https://api-3281216083-arvancloud-challenge.apps.ir-central1.arvancaas.ir/api/users/login", {
        const response = await fetch(`${config.API_BASE}/users/login`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({user: {email, password}}),
            signal
        }).catch((e) => {
            console.log(e)
        })


        const result = await response.json()

        // error handle
        if (!response.ok) {
            if (result.errors?.["email or password"]) {
                toast.message("Error", "Sign-in Failed!", "Username and/or Password is invalid")
                emailInput.message("error")
                passwordInput.message("error")
            }
            return
        }

        // store user data and token and redirect
        saveUserData(result.user.token, result.user.username)
        toast.message("success", "Logged in!", "You'll be re-directed shortly")
        window.location.href = "/articles"
    } finally {
        submitButton.removeAttribute("loading")
    }
}))