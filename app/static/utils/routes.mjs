/**
 * @module routes
 * @description Defines the client-side route table and utility for rendering HTML into #routerView.
 */

import {navigate} from "./router.mjs"
import {config} from "./config.js"

/**
 * Render HTML content into #routerView.
 *
 * @param {string} html - HTML string to render.
 */
export function renderHTML(html) {
    const tpl = document.createElement("template")
    tpl.innerHTML = html
    // TODO FIX THIS SHIT
    document.getElementById("routerView").replaceChildren(tpl.content)
}

/**
 * @typedef {Object} RouteOrder
 * @property {number} x - Horizontal order for route layout/animation.
 * @property {number} y - Vertical order for route layout/animation.
 */

/**
 * @typedef {Object} Route
 * @property {string | RegExp} pattern - URL pattern (exact match string or RegExp for dynamic routes).
 * @property {boolean} [guarded] - True if route requires authentication.
 * @property {RouteOrder} order - Logical order of the route (for animation or grouping).
 * @property {Array<Function>} preloads - Array of async functions to preload route resources.
 * @property {(match: string[]) => Promise<void>} load - Async function to dynamically render route content.
 */

/**
 * Array of routes defining the client-side navigable paths.
 *
 * @type {Route[]}
 */
export const routes = [
    {
        // /articles or /articles/page/:page
        pattern: /^\/articles(?:\/page\/(\d+))?$/,
        guarded: true,
        order: {x: 1, y: 1},
        preloads: [
            () => import("../component/articleTable.mjs"),
            () => import("../component/pagination.mjs"),
        ],
        /**
         * Load the articles page with optional pagination.
         * @param {string[]} match - RegExp match array from route pattern.
         */
        load: async ([, page = "1"]) => {
            renderHTML(`
                <section id="allPosts">
                    <div class="header">
                        <h3>All Posts</h3>
                    </div>
                    <div class="body">
                        <article-table page="${page}"></article-table>
                    </div>
                </section>`)

            await import("../component/articleTable.mjs")
            await import("../component/pagination.mjs")
        },
    },
    {
        // /articles/create
        pattern: "/articles/create",
        guarded: true,
        order: {x: 1, y: 2},
        preloads: [
            () => import("../component/editor.mjs"),
            () => import("./auth.js"),
            () => import("../component/tags.mjs"),
        ],
        load: async () => {
            renderHTML(`<component-editor type="create"></component-editor>`)

            // import and define components
            if (!customElements.get("component-editor")) {
                const {Editor, config: configEditor} = await import("../component/editor.mjs")
                const {withSubmitLock} = await import("./auth.js")
                configEditor.API_BASE = config.API_BASE
                configEditor.withSubmitLock = withSubmitLock
                customElements.define("component-editor", Editor)
            }
            if (!customElements.get("component-tags")) {
                const {Tags, config: configTags} = await import("../component/tags.mjs")
                configTags.API_BASE = config.API_BASE
                customElements.define("component-tags", Tags)
            }
        },
    },
    {
        // /articles/edit/:slug
        pattern: /^\/articles\/edit\/([^/]+)$/,
        guarded: true,
        order: {x: 1, y: 3},
        preloads: [
            () => import("../component/editor.mjs"),
            () => import("../component/tags.mjs")
        ],
        /**
         * Load the article editor for editing a specific article.
         * @param {string[]} match - RegExp match array; [1] = slug
         */
        load: async ([, slug]) => {
            renderHTML(`<component-editor type="edit" slug="${slug}"></component-editor>`)

            if (!customElements.get("component-editor")) {
                const {Editor, config: configEditor} = await import("../component/editor.mjs")
                const {withSubmitLock} = await import("./auth.js")

                configEditor.API_BASE = config.API_BASE
                configEditor.withSubmitLock = withSubmitLock
                customElements.define("component-editor", Editor)
            }
            if (!customElements.get("component-tags")) {
                const {Tags, config: configTags} = await import("../component/tags.mjs")
                configTags.API_BASE = config.API_BASE
                customElements.define("component-tags", Tags)
            }
        },
    },
]