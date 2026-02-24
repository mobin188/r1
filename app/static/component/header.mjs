"use strict"

import {logout} from "../utils/auth.js"

// component styles
const styleSheet = new CSSStyleSheet()
styleSheet.replaceSync(`
:host {
    position: sticky;
    top: 0;
    z-index: 1;
    flex: 1 0 100%;
    
    display: flex;
    flex-flow: row wrap;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-03) var(--space-06);

    background-color: var(--bg-neutral-default-1-l);
    border-bottom: solid 1px var(--border-neutral-default3-l);
    
    #logo {
        padding: var(--space-02) var(--space-03);
        
        border-radius: var(--borderRadiusSm);
        background-color: var(--bg-neutral-l);
    }
}`)

export class Header extends HTMLElement {
    constructor() {
        super()

        // component template
        let template = document.createElement("template")
        template.innerHTML = `
            <span class="txt-body2" id="welcome">
                Welcome <strong id="username"></strong>
            </span>
            <span class="txt-body1" id="logo">Arvancloud Challenge</span>
            <component-button id="logout" type="button" class="secondary txt-body2 strong">Log out</component-button>`

        // attach shadow dom to the component
        this.attachShadow({mode: "open"})
            .appendChild(template.content.cloneNode(true))

        // node references
        this.nodeUsername = this.shadowRoot.getElementById("username")
        this.nodeBtnLogout = this.shadowRoot.getElementById("logout")

        // add logout event listener
        this.nodeBtnLogout.addEventListener("click", logout)
    }

    attributeChangedCallback(name, oldVal, newVal) {
    }

    connectedCallback() {
        // apply styles
        this.shadowRoot.adoptedStyleSheets.push(styleSheet)

        // display username
        this.nodeUsername.innerHTML = localStorage.getItem("username")
    }
}

customElements.define("component-header", Header)