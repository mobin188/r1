"use strict"

import {ROUTER_EVENTS} from "../utils/router.mjs";

/**
 * @module component/navbar
 *
 * @description
 * Navigation sidebar component.
 * Responsible for:
 *
 * - Rendering a vertical navigation menu using Shadow DOM for style isolation.
 * - Listening for application-level router events to update which route is active.
 * - Applying a configurable stylesheet and interaction states.
 *
 * The component does **not** perform navigation itself. Instead, it reacts to
 * router events emitted elsewhere in the application. This ensures clean
 * separation between UI and routing logic.
 *
 * Usage example in HTML:
 * ```html
 * <component-navbar>
 *     <a href="/articles" data-route class="menu-item">
 *         <span>All Articles</span>
 *     </a>
 *     <a href="/articles/create" data-route class="menu-item">
 *         <span>New Article</span>
 *     </a>
 *   ...
 * </component-navbar>
 * ```
 */

/**
 * @internal
 * The component's internal stylesheet. Applied to the Shadow DOM using
 * `adoptedStyleSheets` for optimal performance and encapsulation.
 *
 * The stylesheet uses theme tokens (CSS variables) defined in globalStyles.js
 */

// component styles
const styleSheet = new CSSStyleSheet()
styleSheet.replaceSync(`
:host {
    width: 17%;

    padding: var(--space-04);
    display: flex;
    flex-flow: column nowrap;
    gap: var(--space-01);
            
    background-color: var(--bg-neutral-default-1-l);
    
    .menu-item {
        padding: var(--space-02);
        transition: color 300ms, background 300ms;
        color: inherit;
            
        span:first-of-type {
            width: 100%;
            float: left;
        }
        
        span.txt-caption1 {
            color: var(--color-neutral-default-l);
        }
        
        /* STATES */
        &:hover, &:focus-visible {
            color: var(--color-neutral-hover-l);
            background: var(--bg-neutral-hover-1-l);
            cursor: pointer;
        }
        &:active {
            color: var(--color-neutral-focus-l);
            background: var(--bg-neutral-active-1-l);
        }
        
        &.active {
            color: var(--color-primary-default-1-l);
            background-color: var(--bg-primary-default-1-l);
            
            &:hover {
                color: var(--color-primary-hover-1-l);
                background-color: var(--bg-primary-hover-1-l);               
            }
        }
    }
}

/* LAPTOP */
@media screen and (width < 1025px){
    :host {
        position: fixed;
        z-index: 1;
        bottom: var(--space-03);
        left: var(--space-03);
        
        width: auto;
        padding: var(--space-03);
        flex-flow: row nowrap;
        gap: var(--space-03);
        
        box-shadow: 0 0 .5em .1em hsla(0, 0%, 0%, 0.2);
        border-radius: var(--borderRadiusMd);
        
        .menu-item {
            padding: var(--space-01);
        }
    }
}`)

/**
 * @class Navbar
 * @extends HTMLElement
 *
 * @classdesc
 * `<component-navbar>` is navigation component. It mirrors its
 * light-DOM content into Shadow DOM for style isolation, and updates the active
 * link in response to router events.
 */
export class Navbar extends HTMLElement {
    constructor() {
        super()

        // attach shadow dom to the component and insert nodes to shadow DOM
        this.attachShadow({mode: "open"}).innerHTML = this.innerHTML

        /**
         * @type {NodeListOf<HTMLAnchorElement>}
         * Links inside the navigation menu that declare a route via `data-route`.
         */
        this.links = this.shadowRoot.querySelectorAll("a[data-route]")
    }

    attributeChangedCallback(name, oldVal, newVal) {
    }

    connectedCallback() {
        // apply styles
        this.shadowRoot.adoptedStyleSheets.push(styleSheet)
        this.classList.add("txt-body1")

        // listen for navigation events (custom)
        window.addEventListener(ROUTER_EVENTS.LOADED, e => {
            this.setActive(e.detail.path)
        })
    }

    /**
     * Updates the active navigation link based on the given pathname.
     *
     * @param {string} pathname - The current URL path.
     *
     * @example
     * navbar.setActive("/articles/page/2");
     */
    setActive(pathname) {
        this.links.forEach(link => {
            const linkPath = link.getAttribute("href")

            // priority rules:
            // 1. Exact match
            // 2. /articles should be active for itself and /articles/page/*
            // 3. /articles/create should be active for itself and /articles/edit/*
            let isActive = false

            if (pathname === linkPath) {
                isActive = true
            } else if (linkPath === "/articles") {
                isActive = pathname === "/articles" || pathname.startsWith("/articles/page/")
            } else if (linkPath === "/articles/create") {
                isActive = pathname.startsWith("/articles/create") || pathname.startsWith("/articles/edit/")
            }

            link.classList.toggle("active", isActive)
        })
    }

}

customElements.define("component-navbar", Navbar)