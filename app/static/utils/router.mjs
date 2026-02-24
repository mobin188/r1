"use strict"

import {getToken} from "./auth.js"
import {routes, renderHTML} from "./routes.mjs"

/**
 *  - Match a pathname against a static route table (string or RegExp patterns)
 *  - Enforce auth guards via getToken()
 *  - Dynamically import and mount view components into #routerView
 *  - Emit lifecycle events for view component to react
 *  - Provide a small navigation API (navigate) for programmatic route changes
 *
 *  - Mount point: <main id="routerView">…</main>
 *  - SSR hint:    #routerView[data-route-init] means “route rendered by server”
 *  - Event:       window.dispatchEvent(new CustomEvent("route-loaded", { detail: { path } }))
 *
 * Public API:
 *  - initRouter():   sets up listener for <a data-route>, popstate handling, initial load
 *  - loadRoute(path):matches & loads a route
 *  - navigate(to):   push/replace + load in one call
 */


/**
 * Router lifecycle events.
 * @readonly
 * @enum {string}
 */
export const ROUTER_EVENTS = Object.freeze({
    LOADED: "route-loaded",
    NAVIGATING: "navigating initiated"
})

/** token to cancel stale navigations (prevents race conditions) */
let navToken = 0

/** DOM mount for route content */
const view = /** @type {HTMLElement|null} */ (document.getElementById("routerView"))
if (!view) {
    throw new Error("[router] #routerView not found in DOM")
}

// ─────────────────────────────────────────────
// MATCHING UTILITIES & NAVIGATION API
// ─────────────────────────────────────────────

/**
 * Matches a given pathname with a route (string / RegExp pattern)
 *
 * @param {{ pattern: string|RegExp }} route - Route configuration object
 * @param {string} pathname - The URL path to match (no query or hash)
 * @returns {{ matched: boolean, params?: Array<string> }}
 *          matched - True if the route pattern matches the pathname
 *          params  - Regex match array (if RegExp pattern) or empty array (if string match)
 *
 * Usage:
 *   const { matched, params } = matchRoute(route, "/articles/page/2")
 *   if (matched) route.load(params)
 */
export function matchRoute(route, pathname) {
    if (typeof route.pattern === "string") {
        return pathname === route.pattern
            ? {matched: true, params: []}
            : {matched: false}
    }

    const m = pathname.match(route.pattern)
    return m ? {matched: true, params: m} : {matched: false}
}

/**
 * Navigates to a path within the app
 * Optionally replaces the current history entry instead of adding a new one
 *
 * @param {string} to - Target URL (relative to app root)
 * @param {Object} [options] - Optional navigation settings
 * @param {boolean} [options.replace=false] - If true, replace current history entry
 * @returns {Promise<void>} Resolves after the route is loaded
 */
export function navigate(to, {replace = false} = {}) {
    // only re-initialize the route of it's the current path
    if (to === location.pathname) {
        return loadRoute(to)
    }

    // store the origin path for animating source
    const from = location.pathname

    replace
        ? history.replaceState({}, "", to)
        : history.pushState({}, "", to)

    // load the target route
    return loadRoute(to, from)
}


/**
 * Animates the old and new view upward/downward based on their relative position or sepcification in the <a> link
 *
 * @param {RouteOrder} originPosition - The origin route
 * @param {RouteOrder} destinationPosition - The destination route
 * @returns {Promise<void>} Resolves halfway through the animation, when the old route is fully faded
 */
// TODO - update to support horizontal animations
function viewAnimate(originPosition, destinationPosition) {
    // figure out the animation direction based on the origin and destination route order
    const direction = originPosition.y < destinationPosition.y ? "up" : "down"

    return new Promise((resolve) => {
        // apply ease-in-out animation
        document.body.classList.add("view-" + direction)

        // resolve halfway through the animation
        setTimeout(() => {
            resolve()
        }, 200)

        // remove the animation class (cleanup for later uses)
        setTimeout(() => {
            document.body.classList.remove("view-" + direction)
        }, 400)
    })
}


/**
 * Loads and initializes the matching route component
 * - Skips re-render if HTML was server-rendered
 * - Applies route guards
 * - Dynamic imports and swaps of content in #routerView
 * - Dispatch a "route-loaded" event upon success (SSR or CSR)
 *
 * Safe against race conditions: only the latest navigation is allowed to render
 *
 * @param {string} [pathname=location.pathname]
 * @param {string} [from] - Pathname of the currently active route from which we are redirecting
 * @returns {Promise<void>}
 */
export async function loadRoute(pathname = location.pathname, from = null) {
    // omit extra slashes at the end of pathname
    if (pathname[pathname.length - 1] === "/" && pathname !== "/") {
        pathname = pathname.slice(0, -1)
    }

    const token = ++navToken // invalidate earlier navigation requests

    // find a matching route (destination and active)
    let activeRoute = null
    let destinationRoute = null
    let destinationRouteParams = []
    for (const route of routes) {
        // avoid extra loops if all routes necessary are already found
        if (from ? destinationRoute && activeRoute : destinationRoute) break

        // find the destination route
        if (!destinationRoute) {
            const {matched: destinationRouteMatched, params} = matchRoute(route, pathname)
            if (destinationRouteMatched) {
                destinationRoute = route
                destinationRouteParams = params
                continue
            }
        }

        // find the origin route (if specified by navigator)
        if (from && !activeRoute) {
            const {matched: activeRouteMatched} = matchRoute(route, from)
            if (activeRouteMatched) {
                activeRoute = route
            }
        }
    }

    // 404
    if (!destinationRoute) {
        renderHTML(`
    <section>
        <h3>Not found</h3>
        <p>No route matches <code>${pathname}</code></p>
    </section>
  `)
        return dispatchLoaded(pathname, token)
    }

    // redirect unauthenticated user to login
    if (destinationRoute.guarded && !getToken()) {
        return location.href = "/"
    }

    // stop if the route is already rendered by server
    const isServerRendered = view.hasAttribute("data-route-init")
    if (isServerRendered) {
        view.removeAttribute("data-route-init")
        dispatchLoaded(pathname, token) // event dispatched for components like navbar to sync state on initial load
        return
    }

    try {
        from && await viewAnimate(activeRoute.order, destinationRoute.order)
        view.replaceChildren()

        await destinationRoute.load(destinationRouteParams)
        if (token !== navToken) return // stop if a newer navigation came after this one

        // post-load lifecycle: notify listeners and restore scroll
        dispatchLoaded(pathname, token)
        window.scrollTo(0, 0)
    } catch (err) {
        console.error("[router] Error loading route:", err)
    }
}


// ─────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────
/**
 * Initializes client-side routing:
 *  - Intercepts <a data-route> clicks via window-level delegation (light + shadow DOM)
 *  - Preserves modified/middle clicks and cross-origin links
 *  - Handles back/forward with popstate
 *  - Triggers an initial load to sync UI on first render (SSR-aware)
 */
export function initRouter() {
    window.addEventListener("click", handleRouteLinkClick, true)
    window.addEventListener("popstate", () => {
        // use navigate semantics (no push/replace) for back/forward: just load
        void loadRoute(location.pathname)
    })

    // initial sync with the current URL (dispatches "route-loaded" even if SSR)
    void loadRoute(location.pathname)

    void initPreloader()
}

async function initPreloader() {
    const {Preloader} = await import("./preloader.mjs")

    // find nearest routes and queue their preloads
    const queueRoutes = () => {
        for (const route of routes) {
            const {matched} = matchRoute(route, location.pathname)

            if (!matched) continue

            return preloadRoutesQueue(route, routes)
        }
    }


    // Construct the preloader
    let signalPreloader = new AbortController()
    const preloader = new Preloader(queueRoutes().map(r => r.preloads).flat(),
        {signal: signalPreloader.signal})
    void preloader.start()
}

/**
 * Find optimal next routes to preload based on spatial order proximity.
 *
 * Routes using the 2D order grid ({x, y}) defined in `routes.mjs`.
 *
 * @param {import("./routes.mjs").Route} currentRoute - The currently active route object.
 * @param {Array<import("./routes.mjs").Route>} routes - The full route table.
 * @returns {Array<import("./routes.mjs").Route>} - Suggested routes to preload next.
 */
export function preloadRoutesQueue(currentRoute, routes) {
    if (!currentRoute?.order) throw new Error("Invalid current route passed: " + currentRoute)

    const {x, y} = currentRoute.order

    const scored = routes
        .filter(r => r !== currentRoute && r.order)
        .map(r => ({
            route: r,
            // simple Manhattan distance (|dx| + |dy|)
            distance: Math.abs(r.order.x - x) + Math.abs(r.order.y - y),
        }))
        // sort by proximity
        .sort((a, b) => a.distance - b.distance)

    return scored.map(r => r.route)

    // suggest the closest 1–2 routes only
    // return scored.filter(s => s.distance <= 1).map(s => s.route)
}


// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
/**
 * Delegated click handler for in-app navigation links (shadow and light DOM)
 *
 * @param {MouseEvent} event
 */
function handleRouteLinkClick(event) {
    // only left-click, no ctrl|alt|shift, not prevented elsewhere
    if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
    ) return

    // find the nearest <a data-route> on the composed path
    const path = event.composedPath()
    const link = path.find(
        (el) => el instanceof HTMLAnchorElement && el.hasAttribute("data-route")
    )
    if (!link) return

    // navigate to (load) route
    const url = new URL(link.href, location.origin)
    if (url.origin !== location.origin) return

    event.preventDefault()
    void navigate(url.pathname)
    dispatchEvent(new CustomEvent(ROUTER_EVENTS.NAVIGATING))
}


/**
 * Dispatch "route-loaded" lifecycle event
 * Cancel if a newer navigation superseded the current one
 *
 * @param {string} path
 * @param {number} token
 */
function dispatchLoaded(path, token) {
    if (token !== navToken) return
    window.dispatchEvent(new CustomEvent(ROUTER_EVENTS.LOADED, {detail: {path}}))
}