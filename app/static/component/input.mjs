"use strict"

// component styles
const styleSheet = new CSSStyleSheet()
styleSheet.replaceSync(`
:host {
    display: flex;
    flex-flow: column nowrap;
    /*gap: .56em;*/
        
    label {
        width: fit-content;
        margin-bottom: var(--inputGap);
    }
    
    #input {
        position:relative;
        flex: 1;
    
        padding: var(--inputPad);
        
        transition: color 300ms, border-color 300ms, box-shadow 600ms; /* hover and focus color transitions */
        color: var(--color-neutral-hover-l);
        border: solid 1px var(--border-neutral-default-2-l);
        border-radius: var(--borderRadiusMd);
        box-shadow: 0 0 0 1px hsla(0, 0%, 0%, 0%);
        
        font-size: inherit;
        font-weight: inherit;
        line-height: inherit;
        
        /* STATES */
        /* default */
        &::placeholder {
            transition: color 300ms, border-color 300ms; /* hover and focus color transitions */
            color: var(--border-neutral-default-2-l);
        }
        /* hover */
        &:hover, &:hover::placeholder {
            border-color: var(--border-neutral-hover2-l);
            color: var(--color-neutral-hover-l);
        }
        /* active */
        &:focus-visible {
            border-color: var(--border-input-active-l);
            color: var(--color-input-active-l);
        }
        /* readonly */
        &[readonly] {
            border-color: var(--border-input-readonly-l);
            color: var(--color-input-readonly-l);
        }
        /* disabled */
        &[disabled]:hover, &[disabled]:hover::placeholder {
            border-color: var(--border-neutral-default-2-l) !important;
            color: var(--border-neutral-default-2-l) !important;
        }
    }
    
    #message {
        max-height: 0;
        overflow: hidden;
        
        transition: max-height 300ms 0ms, padding-top 500ms, color 1ms 700ms; /* message expand/collapse transition */
    }
}

/* MESSAGE */
/* expand message box*/
:host([message]) {
    #message:not(:empty) {
        padding-top: var(--inputGap);
        max-height: 5em;
    }
}
/* error */
:host([message="error"])  {
    #input {
        box-shadow: 0 0 0 1px var(--border-input-error-l);
    }
    #message {
        color: var(--border-input-error-l);    
        transition: max-height 800ms, padding-top 300ms, color 0s;
    }
}
/* info */
:host([message="info"])  {
    #input {
        /*box-shadow: 0 0 0 1px var(--border-input-error-l);*/
    }
    #message {
        color: var(--color-info-default-1-l);    
        transition: max-height 800ms, padding-top 300ms, color 0s;

    }
}

/* TEXTAREA */
:host([type="textarea"]) {
    #input {
        font-size: inherit !important;
        font-weight: inherit !important;
        font-family: inherit !important;
        line-height: inherit !important;
        resize: none;
        outline: none;
    }
}

/* CHECKBOX */
:host([type="checkbox"]) {
    
    label {
        display: flex;
        flex-flow: row-reverse nowrap;
        justify-content: center;
        align-items: center;
        
        margin: 0;
        gap: var(--space-01);
        
        #input {
            display: none;
        }
        #checkmark {
            position: relative;
            width: 16px;
            height: 16px;
            
            transition: background-color 250ms, border-color 250ms;
            
            border-radius: var(--borderRadiusSm);
            background: var(--bg-neutral-default-1-l);
            border: solid 2px var(--border-neutral-default-1-l);
        }
    }
    
    label:hover {
        #checkmark {
            background: var(--bg-neutral-hover-1-l);
            border-color: var(--border-neutral-hover-1-l);
        }
    }
    
    label:active {
        #checkmark {
            background: var(--bg-neutral-active-1-l);
            border-color: var(--border-neutral-active-1-l);
        }
    }

}
/* STATE - CHECKED */
:host([type="checkbox"][checked]) {
    label {
        #checkmark {
            background: var(--bg-primary-default-2-l);    
            border-color: var(--bg-primary-default-2-l);    
            
            /* the checkmark */
            &:before {
                content: url("data:image/svg+xml,%3Csvg%20width%3D%2210%22%20height%3D%228%22%20viewBox%3D%220%200%2010%208%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M9.818%200.68179C9.99374%200.857526%209.99374%201.14245%209.818%201.31819L3.6305%207.50569C3.45477%207.68142%203.16984%207.68142%202.99411%207.50569L0.181607%204.69319C0.00587071%204.51745%200.00587071%204.23253%200.181607%204.05679C0.357343%203.88105%200.642267%203.88105%200.818003%204.05679L3.3123%206.55109L9.18161%200.68179C9.35734%200.506054%209.64227%200.506054%209.818%200.68179Z%22%20fill%3D%22white%22%2F%3E%3C%2Fsvg%3E");
                position: absolute;
                inset: 0;
                bottom: 6%; /* visual alignment */
                display: flex;
                justify-content: center;
                align-items: center;
            }
        }
        
        &:hover, &:focus-visible {
            #checkmark {
                background: var(--bg-primary-hover-2-l);    
                border-color: var(--bg-primary-hover-2-l); 
            }
        }
        &:active {
            #checkmark {
                background: var(--bg-primary-active-2-l);    
                border-color: var(--bg-primary-active-2-l); 
            }
        }
    }
}
`)


export class Input extends HTMLElement {
    static formAssociated = true // to add support for form submission
    static observedAttributes =
        ["type", "name", "label", "placeholder", "value", "rows", "cols", "autocomplete", "readonly", "disabled",
            "required"]


    constructor() {
        super()

        // component template
        let template = document.createElement("template")
        template.innerHTML = `
            <label for="input" class="txt-body2"></label>
            <input id="input"/>
            <strong id="message" class="txt-caption1"></strong>
        `

        // attach shadow dom to the component
        this.attachShadow({mode: "open"})
            .appendChild(template.content.cloneNode(true))

        // references to local nodes
        this.nodeInput = this.shadowRoot.getElementById("input")
        this.nodeLabel = this.shadowRoot.querySelector("label")
        this.nodeMessage = this.shadowRoot.getElementById("message")

        // feature detect, native form association
        if ('attachInternals' in this) {
            this._internals = this.attachInternals()
        }
        // reference for fallback hidden input (Safari, old browsers)
        this._hiddenInput = null

        // flag to prevent duplicate event listeners
        // this._listenerAttached = false
    }

    attributeChangedCallback(name, oldVal, newVal) {
        switch (name) {
            case "type":
                this.nodeInput.type = newVal

                // EXCEPTION - textarea
                if (newVal === "textarea") {
                    this.nodeInput.remove()

                    this.nodeInput = document.createElement("textarea");
                    this.nodeInput.id = "input"
                    this.nodeInput.name = this.getAttribute("name")

                    this.nodeInput.placeholder = this.getAttribute("placeholder") === null ? "" : this.getAttribute("placeholder")
                    this.nodeInput.value = this.getAttribute("value")
                    this.nodeInput.required = this.hasAttribute("required")
                    this.nodeInput.readOnly = this.hasAttribute("readonly")
                    this.shadowRoot.insertBefore(this.nodeInput, this.nodeMessage)
                }

                // EXCEPTION
                if (newVal === "checkbox") {

                    // move hidden input into the label
                    this.nodeLabel.appendChild(this.nodeInput)

                    // create visual checkbox span
                    const checkmark = document.createElement("span")
                    checkmark.id = "checkmark"
                    this.nodeLabel.appendChild(checkmark)


                    // ensure a default value attribute (like native checkboxes)
                    if (!this.nodeInput.hasAttribute("value")) {
                        this.nodeInput.value = "on"
                    }

                    // initial form-value sync (in case it's pre-checked)
                    if (this._internals) {
                        const initial = this.nodeInput.checked
                            ? this.nodeInput.value
                            : null
                        this._internals.setFormValue(initial)
                    }

                    // update on each change (checked ↔ unchecked)
                    this.addEventListener("change", (e) => {
                        // check if event was fired externally or by the shadow dom input
                        if (e.detail === undefined) {
                        //     manually check hidden input if event dispatched programmatically
                            this.nodeInput.checked = true
                        }

                        // apply "checked" state
                        this.toggleAttribute("checked", this.nodeInput.checked)

                        // update form value
                        if (this._internals) {
                            const val = this.nodeInput.checked
                                ? this.nodeInput.value
                                : null
                            this._internals.setFormValue(val)
                        }
                    })

                    this.nodeInput.addEventListener("change", () => {
                        this.dispatchEvent(new CustomEvent("change", {'detail': {internal: true}}))
                    })
                }
                break

            case "name":
                this.nodeInput.name = newVal
                break

            case "label":
                this.nodeLabel.insertAdjacentHTML("afterbegin", newVal)
                break

            case "placeholder":
                this.nodeInput.placeholder = newVal
                break

            case "value":
                // throw error if value is trying to be set for a disabled input
                if (this.hasAttribute("disabled")) {
                    console.error(this)
                    throw new Error("Can't assign value to disabled input!")
                }
                this.nodeInput.value = newVal

                break

            case "rows":
                this.nodeInput.rows = newVal
                break

            case "cols":
                this.nodeInput.cols = newVal
                break;

            case "readonly":
                this.nodeInput.readOnly = true
                break

            case "autocomplete":
                this.nodeInput.autocomplete = newVal
                break

            case "disabled":
                this.nodeInput.disabled = newVal !== null;
                break;

        }
    }

    connectedCallback() {
        // apply styles
        this.shadowRoot.adoptedStyleSheets.push(styleSheet)

        // If using fallback, inject a hidden input into the light DOM
        if (!this._internals && !this._hiddenInput) {
            const name = this.getAttribute('name')
            if (name) {
                const hidden = document.createElement('input')
                hidden.type = 'hidden'
                hidden.name = name
                hidden.value = this.nodeInput.value
                this._hiddenInput = hidden
                this.appendChild(hidden)
            }
        }


        // input validation
        this.nodeInput.addEventListener('blur', () => this.checkValidity())
        this.nodeInput.addEventListener('input', () => this.checkValidity())

    }

    get value() {
        return this.nodeInput.value
    }

    set value(val) {
        this.nodeInput.value = val

        // Sync programmatic value change
        if (this._internals) {
            this._internals.setFormValue(val)
        } else if (this._hiddenInput) {
            this._hiddenInput.value = val
        }
    }

    message(type, content = "") {
        this.setAttribute("message", type)
        this.nodeMessage.innerHTML = content
    }

    message_clear() {
        this.removeAttribute("message")
    }

    // form validation API
    get validationMessage() {
        return this._internals.validationMessage;
    }

    checkValidity() {
        const value = this.nodeInput.value

        // Sync value with form based on whether the input is placed in light or shadow DOM
        // TODO
        // if (this.getRootNode() instanceof ShadowRoot) {
        if (this._internals) {
            this._internals.setFormValue(value)
        } else if (this._hiddenInput) {
            this._hiddenInput.value = value
        }

        // dispatch input event so parent forms can listen
        // this.dispatchEvent(new Event('input', {bubbles: true}))

        // check if required inputs is filled
        if (this.hasAttribute("required") && !this.value.trim()) {
            if (this._internals) this._internals.setValidity({valueMissing: true}, "Required field", this.nodeInput)
            return false
        }

        // validate email
        if (this.getAttribute("type") === "email") {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
            const isValidEmail = (email) => emailRegex.test(email)

            if (!isValidEmail(this.value)) {
                if (this._internals) this._internals.setValidity({patternMismatch: true}, "Email is not valid", this.nodeInput)
                return false
            }
        }

        if (this._internals) this._internals.setValidity({})
        this.getAttribute("message") === "error" && this.message_clear()
        return true
    }

    reportValidity() {
        const valid = this.checkValidity()
        if (!valid) {
            this.nodeInput.focus()
        }
        return valid
    }
}

customElements.define("component-input", Input)