"use strict"

const styleSheet = new CSSStyleSheet()
styleSheet.replaceSync(`
:host {
    position: absolute;
    inset: 0;
    display: flex;
    
    flex-flow: column nowrap;
    justify-content: center;
    align-items: center;
        
    z-index: 9;
    visibility: hidden;
    opacity: 0;
    transition: background-color 300ms, opacity 300ms, visibility 500ms;

    #modalWrapper {  
        width: 30%;
        background: var(--bg-neutral-default-1-l);
        border-radius: var(--borderRadiusMd);
        
        /* hide modal on default */

        transform: translate3d(0, -10%, 0);
        
        transition: visibility 1ms, opacity 300ms 1ms, transform 500ms 1ms;
        
        #header {
            display: flex;
            flex-flow: column nowrap;
            padding: var(--space-04) var(--space-06);
            
            border-bottom: solid 1px var(--border-neutral-default3-l);
            
            #caption {
                color: var(--color-neutral-default-2-l);
            }
        }
        
        #body {
            display: flex;
            flex-flow: column nowrap;
            justify-content: center;
            align-items: center;
            padding: var(--space-06);
            gap: var(--space-02);
            
            border-bottom: solid 1px var(--border-neutral-default3-l);
        }
        
        #footer {
            display: flex;
            flex-flow: row wrap;
            justify-content: flex-end;
            gap: var(--space-04);
            padding: var(--space-04) var(--space-06);
        }
    }
}

/* STATES */
:host([danger="true"]) {
    
}

/* EASE-IN */
:host(.ease-in) {
    /*display: flex;*/
    background: hsla(0, 0%, 0%, .32);
    
            visibility: visible;
        opacity: 1;
        
    #modalWrapper {
        transform: translate3d(0, 0%, 0);

    }
}
`)

export class Modal extends HTMLElement {
    static observedAttributes = ["danger"]

    constructor() {
        super()

        let template = document.createElement("template")
        template.innerHTML = `
        <div id="modalWrapper">
            <div id="header">
                <slot name="title" id="title" class="txt-body1"></slot>
                <slot name="caption" id="caption" class="txt-caption1"></slot>
            </div>
            <div id="body">               
                <slot name="message"></slot>
            </div>
            <div id="footer"></div>
        </div>`

        // attach shadow dom
        this.attachShadow({mode: "open"})
            .appendChild(template.content.cloneNode(true))

        this.nodeBody = this.shadowRoot.getElementById("body")
        this.nodeFooter = this.shadowRoot.getElementById("footer")
    }

    attributeChangedCallback(name, oldVal, newVal) {
        switch (name) {
            case "danger":
                if (newVal === null) return

                // danger icon in modal body
                let temp = document.createElement("template")
                temp.innerHTML =
                    `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="56" height="56" rx="28" fill="#FAE4E4"/>
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M28 24.4799C28.4971 24.4799 28.9 24.8828 28.9 25.3799V29.1199C28.9 29.6169 28.4971 30.0199 28 30.0199C27.503 30.0199 27.1 29.6169 27.1 29.1199V25.3799C27.1 24.8828 27.503 24.4799 28 24.4799Z" fill="#D61E20"/>
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M26.85 32.3783C26.8472 31.7384 27.3663 31.225 27.999 31.225C28.6327 31.225 29.15 31.7376 29.15 32.375C29.15 33.01 28.6351 33.525 28 33.525C27.3661 33.525 26.8518 33.0118 26.85 32.3783Z" fill="#D61E20"/>
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M29.2472 20.5854C28.6956 19.6194 27.3039 19.6194 26.7523 20.5854L19.0932 33.9897C18.5454 34.9475 19.2367 36.1402 20.3407 36.1402H35.6587C36.7614 36.1402 37.4537 34.9479 36.9063 33.9896L29.2472 20.5854ZM30.8102 19.6927C29.5677 17.517 26.4318 17.517 25.1893 19.6927C25.1893 19.6927 25.1894 19.6926 25.1893 19.6927L17.5305 33.0964C16.2962 35.2545 17.8548 37.9402 20.3407 37.9402H35.6587C38.1441 37.9402 39.7018 35.2544 38.4692 33.0967L30.8102 19.6927C30.8102 19.6927 30.8101 19.6926 30.8102 19.6927Z" fill="#D61E20"/>
                    </svg>`
                this.nodeBody.insertAdjacentHTML("afterbegin", temp.innerHTML)

                // set up footer CTAs
                this.nodeFooter.innerHTML = `
                <component-button type="button" class="danger" data-delete>Delete</component-button>
                <component-button type="button" class="secondary" data-cancel>Cancel</component-button>`

                // CTAs event listener to fire action event to the component
                this.nodeFooter.querySelector("component-button[data-delete]").addEventListener("click", () => {
                    this.dispatchEvent(new CustomEvent("delete"))
                })

                // CTAs event listener to fire action event to the component
                this.nodeFooter.querySelector("component-button[data-cancel]").addEventListener("click", () => {
                    this.dispatchEvent(new CustomEvent("cancel"))
                })
        }
    }

    connectedCallback() {
        // apply styles
        this.shadowRoot.adoptedStyleSheets.push(styleSheet)
    }

    expand({danger, title, caption, message}) {
        if (this.classList.contains("ease-in")) return // avoid re-opening once already opened
        danger === true && this.setAttribute("danger", "")

        this.innerHTML = `
            <span slot="title">${title}</span>
            <span slot="caption">${caption ? caption : ""}</span>
            <span slot="message">${message}</span>`

        this.classList.add("ease-in")
    }

    collapse() {
        if (!this.classList.contains("ease-in")) return
        this.classList.remove("ease-in")

        setTimeout(() => {
            // reset danger state
            this.removeAttribute("danger")
            // remove icon
            this.nodeBody.querySelector("svg").remove()
            // remove call to actions
            this.nodeFooter.querySelectorAll("component-button").forEach((btn) => {
                btn.remove()
            })
        }, 500)
    }
}

customElements.define("component-modal", Modal)