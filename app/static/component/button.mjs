"use strict"

// component styles
const styleSheet = new CSSStyleSheet()
styleSheet.replaceSync(`
@keyframes spin {
  to { transform: rotate(360deg); }
}

:host {
    #button {
        width: auto;
        
        padding-inline-start: var(--btnPadInlineStart);
        padding-inline-end: var(--btnPadInlineStart);
        padding-top: var(--btnPadTop);
        padding-bottom: var(--btnPadBottom);
        
        transition: background-color 150ms, color 150ms, border-color 150ms;
        
        border-radius: var(--borderRadiusLg);
        
        color: var(--btn-color-primary-default);
        background-color: var(--btn-bg-primary-default);
        
        #spinner svg {
            /*display: inline-block;*/
            /*vertical-align: middle;*/
            max-height: 1em;
            animation: spin 0.7s linear infinite;
        }
        
        /* STATES */
        &:focus-visible {
            background-color: red;
            cursor: pointer;
        }
        
        &:hover, &:focus-visible {
            background-color: var(--btn-bg-primary-hover);
            cursor: pointer;
        }
        
        &:active {
            background-color: var(--btn-bg-primary-focus);
        }
    }
}
/* TYPES */
:host(.secondary) {
    #button {
        color: var(--color-neutral-default-l);
        background: none;
        border: solid 1px var(--border-neutral-default-2-l);
        
        &:hover, &:focus-visible {
            color: var(--color-neutral-hover-l);
            background: none;
            border-color: var(--border-neutral-hover2-l);
        }
        &:active {
            color: var(--color-neutral-focus-l);
            border-color: var(--border-neutral-focus2-l);
        }
    }
}
:host(.danger) {
    #button {
        background: var(--bg-error-default-2-l);
        
        &:hover, &:focus-visible {
            background: var(--bg-error-hover-2-l);
        }
        &:active {
            background: var(--bg-error-active-2-l);
        }
    }
}
:host([icon]) {
    #button {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-content: center;
        width: fit-content;
        aspect-ratio: 1 / 1;
        padding: 10px;
    }
}
/* max-width */
/* nested version only worked on Edge some-fucking-how */
:host(.width-100) {
    #button {
        width: 100%;
    }
}
`)

export class Button extends HTMLElement {
    static observedAttributes = ["type", "value", "loading", "icon", "aria-label"]

    constructor() {
        super()

        // component template
        let template = document.createElement("template")
        template.innerHTML = `
            <button id="button">
                <span id="text"></span>
            </button>
    `

        // attach shadow dom to the component
        this.attachShadow({mode: "open"})
            .appendChild(template.content.cloneNode(true))

        // nodes references
        this.nodeButton = this.shadowRoot.getElementById("button")
    }

    attributeChangedCallback(name, oldVal, newVal) {
        switch (name){
            case "type":
                this.nodeButton.type = newVal

                // check if it's a submit button, if so, dispatch submit event to nearest parent <form> on click
                if (newVal === "submit") {
                    this.shadowRoot.querySelector("#button").addEventListener("click", (e) => {
                        // check if the button has already been pressed and is in loading state
                        if (this.hasAttribute("loading")) {
                            return
                        }
                        const form = this.closest("form")
                        if (form) {
                            const event = new Event("submit", {bubbles: true, cancelable: true})
                            form.dispatchEvent(event)
                        }
                    })
                }
                break

            case "value":
                this.nodeButton.value = newVal
                break

            case "loading":
                if (newVal !== null) {
                    this.nodeButton.innerHTML = `
                        <span id="spinner">
                            <svg id="svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <g clip-path="url(#clip)">
                                    <path opacity="0.2" d="M20 10A10 10 0 1 1 0 10A10 10 0 0 1 20 10ZM2 10A8 8 0 1 0 18 10A8 8 0 0 0 2 10Z" fill="white"/>
                                    <path d="M19 10c.55 0 1-.45.95-1-.1-1-.36-2-.76-2.83a9.96 9.96 0 0 0-7.21-5.12C10.45.05 10 .45 10 1s.45 1 .99 1.06c.71.09 1.4.26 2.06.55a8 8 0 0 1 4.39 4.39c.3.66.46 1.35.55 2.06.06.54.47.94 1.01.94Z" fill="white"/>
                                </g>
                                <defs>
                                    <clipPath id="clip">
                                        <rect width="20" height="20" fill="white"/>
                                    </clipPath>
                                </defs>
                            </svg>
                        </span>`
                } else {
                    this.nodeButton.innerHTML = this.innerHTML
                }
                break

            case "aria-label":
                this.nodeButton.ariaLabel = newVal
                break
        }
    }

    connectedCallback() {
        // apply styles
        this.shadowRoot.adoptedStyleSheets.push(styleSheet)

        this.nodeButton.innerHTML = this.innerHTML
    }
}

customElements.define("component-button", Button)