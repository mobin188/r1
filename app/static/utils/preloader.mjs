/**
 * @module preloader
 * Lightweight, production-ready preloading system.
 *
 * - Waits for full page load (window.load)
 * - Pauses preloading during any fetch/XHR requests
 * - Resumes when network is quiet for a short period
 * - Sequential, per-instance, abortable
 * - No recursion, no intervals, baseline 2020 compatible
 */

let globalPatched = false
let globalActiveRequests = 0

/**
 * Patch global fetch() and XMLHttpRequest to track active network requests.
 * Fires a custom "network-activity" event whenever requests start or end.
 */
function patchNetworkMonitoring() {
    console.log("patching")
    if (globalPatched) return
    globalPatched = true

    const notify = () => document.dispatchEvent(new Event("network-activity"))

    // Patch fetch
    const origFetch = window.fetch
    window.fetch = async (...args) => {
        console.log(args)
        globalActiveRequests++
        notify()
        try {
            return await origFetch(...args)
        } finally {
            globalActiveRequests--
            notify()
        }
    }

    // Patch XMLHttpRequest
    const OrigXHR = window.XMLHttpRequest
    window.XMLHttpRequest = function () {
        const xhr = new OrigXHR()
        xhr.addEventListener("loadstart", () => {
            globalActiveRequests++
            notify()
        })
        xhr.addEventListener("loadend", () => {
            globalActiveRequests--
            notify()
        })
        return xhr
    }
}

/**
 * Wait until the full page is loaded (all assets and scripts).
 * @returns {Promise<void>}
 */
export function waitForPageReady() {
    return new Promise((resolve) => {
        if (document.readyState === "complete") {
            resolve()
            return
        }
        window.addEventListener("load", () => resolve(), {once: true})
    })
}

/**
 * @typedef {Object} PreloaderOptions
 * @property {AbortSignal} [signal] Optional abort signal for SPA navigation
 * @property {number} [quietPeriod=1500] Quiet time in ms after network is idle
 * @property {boolean} [debug=false] Enable debug logging
 */

/**
 * Sequential preloader with pause/resume on network activity.
 */
export class Preloader {
    /**
     * @param {Array<Function>} tasks Array of async functions (e.g., dynamic imports)
     * @param {PreloaderOptions} [options]
     */
    constructor(tasks = [], options = {}) {
        this.tasks = tasks
        this.signal = options.signal
        this.quietPeriod = options.quietPeriod || 1500
        this.debug = options.debug || false
        this.aborted = false
        this.currentIndex = 0

        // patchNetworkMonitoring()

        window.addEventListener("beforeunload", () => (this.aborted = true))
        this.signal?.addEventListener("abort", () => (this.aborted = true))
    }

    /**
     * Start preloading tasks sequentially.
     * Pauses if network activity occurs, resumes when quiet.
     */
    async start() {
        try {
            await waitForPageReady()
            if (this.aborted) return

            if (this.debug) console.log("[Preloader] Page ready, starting preload queue.")
            await this._processQueue()
        } catch (err) {
            if (err.name === "AbortError") {
                if (this.debug) console.warn("[Preloader] Aborted.")
            } else {
                console.warn("[Preloader] Error:", err)
            }
        }
    }

    /**
     * @private
     * Sequentially processes queued tasks while respecting network activity.
     * Each task runs only after all active network requests have completed
     * and a quiet period (no new requests) has elapsed.
     *
     * @async
     * @returns {Promise<void>} Resolves when all queued tasks are processed or aborted.
     */
    async _processQueue() {
        while (this.currentIndex < this.tasks.length && !this.aborted) {
            // queue the next task
            const task = this.tasks[this.currentIndex]

            // wait for network to go idle
            if (window.globalActiveRequests > 0) {

                if (this.debug)
                    console.log(`[Preloader] ${window.globalActiveRequests} active requests. Waiting before task ${this.currentIndex + 1}:\n${task}`)

                await new Promise(resolve => {
                        let timerQuiet // quiet period timer

                        const onNetworkAct = () => {
                            if (this.debug)
                                console.log(`[Preloader] ${window.globalActiveRequests} active requests. Waiting before task ${this.currentIndex + 1}:\n${task}`)

                            clearTimeout(timerQuiet)

                            if (window.globalActiveRequests === 0) {
                                document.removeEventListener("network-activity", onNetworkAct)
                                timerQuiet = setTimeout(resolve, this.quietPeriod)
                            }
                        }

                        const onAbort = () => {
                            removeEventListener("network-activity", onNetworkAct)
                            this.signal?.removeEventListener("abort", onAbort)
                            clearTimeout(timerQuiet)
                            this.aborted = true
                            resolve()
                        }

                        document.addEventListener("network-activity", onNetworkAct)
                        this.signal?.addEventListener("abort", onAbort, {once: true})
                    }
                )
            }

            if (this.aborted) break

            try {
                if (this.debug) console.log(`[Preloader] Running task ${this.currentIndex + 1}:\n${task}`)

                // Defer to the next microtask for smooth scheduling
                await Promise.resolve().then(() => task())
            } catch (err) {
                console.warn(`[Preloader] Task ${this.currentIndex + 1} failed:`, err)
            }

            this.currentIndex++
        }

        if (this

                .debug
            && !
                this
                    .aborted
        )
            console
                .log(
                    "[Preloader] All tasks completed."
                )
    }

    /**
     * @public
     * Replace the current queue with a new set of tasks
     * Resets the index and allows preloading to resume
     * @param {Array<Function>} newTasks
     */
    setQueue(newTasks) {
        this.tasks = newTasks
        this.currentIndex = 0
        this.aborted = false
    }
}
