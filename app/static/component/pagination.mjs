"use strict"

const styleSheet = new CSSStyleSheet()
styleSheet.replaceSync(`
:host {
    width: max-content;
    padding: var(--space-01);
    border: solid 1px var(--border-neutral-default-2-l);
    border-radius: var(--borderRadiusMd);

    button {
        text-align: center;

        padding-right: 1px; /* visual alignment */
        width: 32px;
        height: 32px;
        transition: background-color 300ms;
        
        border-radius: var(--borderRadiusMd);
        cursor: pointer;
        
        &:not(:last-of-type) {
        margin-right: var(--space-02);
        }
        
        &:hover, &:focus-visible {
            background: var(--bg-neutral-hover-1-l);
        }
        &:active {
            background: var(--bg-neutral-active-1-l);
        }
    }
    
    button[selected] {
        color: var(--color-neutral-default-3-l);
        background: var(--bg-primary-default-2-l);
        cursor: default;
    }
    
    /* dots span */
    span.dots {
        margin-right: var(--space-02);
    }
}
:host([disabled]) {
    button, button:hover, button:focus-visible {
        color: var(--color-neutral-disabled-l);
    }
    button[selected] {
        color: var(--color-neutral-default-3-l);
        background: var(--bg-primary-disabled-2-l);
    }
}
`)

export class Pagination extends HTMLElement {
    static observedAttributes = ["page", "total", "perpage"]

    constructor() {
        super()

        // attach shadow DOM
        const wrapper = document.createElement("div")
        wrapper.className = "wrap"
        wrapper.id = "wrap"
        this.attachShadow({mode: "open"}).append(wrapper)

        // apply shared and component-level styles
        this.shadowRoot.adoptedStyleSheets.push(styleSheet)
    }

    // getters for attributes, cast to numbers with fallbacks
    get page() {
        return Math.max(1, Number(this.getAttribute("page")) || 1)
    }

    get total() {
        return Math.max(0, Number(this.getAttribute("total")) || 0)
    }

    get perpage() {
        return Math.max(1, Number(this.getAttribute("perpage")) || 10)
    }


    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal !== newVal && ["page", "total", "perpage"].includes(name)) {
            this.render()
        }
    }

    /**
     * Renders the pagination UI based on current state.
     * Emits a `page-change` event when a user clicks a button.
     */
    render() {
        const wrap = this.shadowRoot.getElementById("wrap")
        wrap.textContent = ""

        const total = this.total
        const perpage = this.perpage
        const pages = Math.ceil(total / perpage)

        // Clamp current page between 1 and last
        const currentPage = Math.min(Math.max(this.page, 1), pages)
        if (pages < 2) return // No need for pagination with only 1 page

        const frag = document.createDocumentFragment()

        /**
         * Helper to create a button element
         * @param {string|number} label - Visible text
         * @param {number} pageValue - Target page number
         * @param {boolean} disabled - Optional flag to disable button
         * @returns {HTMLButtonElement}
         */
        const makeBtn = (label, pageValue, disabled = false) => {
            const btn = document.createElement("button")
            btn.classList.add("txt-body2", "strong")
            btn.type = "button"
            btn.textContent = String(label)
            btn.disabled = !!disabled
            btn.setAttribute("data-page", pageValue)

            if (pageValue === currentPage) {
                btn.setAttribute("selected", "")
                btn.setAttribute("aria-current", "page")
            }

            btn.addEventListener("click", () => {
                if (this.hasAttribute("disabled")) return
                if (pageValue !== currentPage) {
                    this.dispatchEvent(new CustomEvent("page-change", {
                        bubbles: true,
                        detail: {page: pageValue}
                    }))
                }
            })

            frag.appendChild(btn)
            return btn
        }

        const makeDots = () => {
            const span = document.createElement("span")
            span.ariaHidden = "true"
            span.className = "dots"
            span.textContent = "…"
            frag.appendChild(span)
        }

        // Previous page
        makeBtn("‹", currentPage - 1, currentPage === 1)

        // First page
        const first = makeBtn(1, 1)
        if (currentPage === 1) first.setAttribute("selected", "")

        // Ellipsis if needed before current page group
        if (currentPage > 3) makeDots()

        // Page numbers around current
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
            if (i > 1 && i < pages) {
                makeBtn(i, i)
            }
        }

        // Ellipsis after current group
        if (currentPage < pages - 2) makeDots()

        // Last page
        if (pages > 1) {
            const last = makeBtn(pages, pages)
            if (currentPage === pages) last.setAttribute("selected", "")
        }

        // Next page
        makeBtn("›", currentPage + 1, currentPage === pages)

        wrap.appendChild(frag)
    }
}

customElements.define("component-pagination", Pagination)