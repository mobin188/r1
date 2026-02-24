"use strict"

// component styles
const styleSheet = new CSSStyleSheet()
styleSheet.replaceSync(`
:host {
    --toastTransition: top 400ms, transform 700ms;

    top: 0;
    left: 0;
    right: 0;
    width: max-content;
    transform: translate3d(0, calc(-100% - 48px), 0);
    z-index: 2;

    position: absolute;
    margin: 0 auto;
    padding-inline-start: var(--toastPadInlineStart);
    padding-inline-end: var(--toastPadInlineEnd);
    padding-top: var(--toastPadTop);
    padding-bottom: var(--toastPadBottom);
    
    border-radius: var(--borderRadiusLg);
    box-shadow: 0 8px 40px 0 #2533433D;
    
    strong {
        margin-right: var(--space-01);
    }
}

/* toast moving in viewport */
/* transition timing applied in connectedCallback function to avoid flash of empty toast on load*/
:host(.ease-in), :host(:hover) {
    top: 56px;
    transform: translate3d(0, 0, 0);
}

/* STATES */
:host([type="error"]) {
    background: var(--bg-error-default-1-l);
    color: var(--color-error-default-1-l);
}
:host([type="success"]) {
    background: var(--bg-success-default-1-l);
    color: var(--color-success-default-1-l);
}
`)

export class Toast extends HTMLElement {
    static observedAttributes = ["type"]

    constructor() {
        super()

        // component template
        let template = document.createElement("template")
        template.innerHTML = `
            <strong class="txt-body2">Strong</strong><span class="txt-caption1">Some fucking caption</span>
        `

        // attach shadow dom to the component
        this.attachShadow({mode: "open"})
            .appendChild(template.content.cloneNode(true))

        // references to local nodes
        this.nodeTitle = this.shadowRoot.querySelector("strong")
        this.nodeCaption = this.shadowRoot.querySelector("span")

        // // hide toast on load
        this.style.transition = "0"
    }

    attributeChangedCallback(name, oldVal, newVal) {
    }

    connectedCallback() {
        // apply styles
        this.shadowRoot.adoptedStyleSheets.push(styleSheet)

        // apply ease-in transition timing
        setTimeout(() => {
            this.style.transition = "var(--toastTransition)"
        }, 1)
    }

    /**
     * Displays a toast notification with the specified type, title, and optional caption.
     * The toast smoothly slides into view, remains visible for 5 seconds, and then hides automatically.
     *
     * @param {"success" | "error"} type - The visual style of the toast. Accepts `"success"` or `"error"`.
     * @param {string} title - The main title text displayed in bold.
     * @param {string} [caption=""] - Optional supporting text displayed beside the title.
     * @returns {void} This method does not return a value.
     *
     * @example
     * const toast = document.querySelector("app-toast");
     * toast.message("success", "Profile updated", "Your changes were saved successfully.");
     */
    message(type, title, caption = "") {
        // set type and message of the toast
        this.setAttribute("type", type)

        this.nodeTitle.innerHTML = title
        this.nodeCaption.innerHTML = caption

        // display the toast
        this.style.transition = "var(--toastTransition)"
        this.classList.add("ease-in")

        // set timer to automatically hide the toast
        setTimeout(() => {
            this.classList.remove("ease-in")
        }, 5000)
    }
}

customElements.define("component-toast", Toast)