"use strict"

// router and auth management
import { initRouter } from "./utils/router.mjs"

/**
 * Patch global fetch() and XMLHttpRequest to track active network requests.
 * Fires a custom "network-activity" event whenever requests start or end.
 */
window.globalActiveRequests = 0
function patchNetworkMonitoring() {
    // if (globalPatched) return
    // globalPatched = true

    const notify = () => document.dispatchEvent(new Event("network-activity"))

    // Patch fetch
    const origFetch = window.fetch
    window.fetch = async (...args) => {
        window.globalActiveRequests++
        notify()
        try {
            return await origFetch(...args)
        } finally {
            window.globalActiveRequests--
            notify()
        }
    }

    // Patch XMLHttpRequest
    const OrigXHR = window.XMLHttpRequest
    window.XMLHttpRequest = function () {
        const xhr = new OrigXHR()
        xhr.addEventListener("loadstart", () => {
            window.globalActiveRequests++
            notify()
        })
        xhr.addEventListener("loadend", () => {
            window.globalActiveRequests--
            notify()
        })
        return xhr
    }
}
patchNetworkMonitoring()

// import components
import "./component/input.mjs"

import "./component/toast.mjs"

import "./component/button.mjs"

import "./component/header.mjs"

import "./component/navbar.mjs"

import "./component/modal.mjs"

// initiate the router
initRouter()