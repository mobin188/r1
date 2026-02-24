"use strict"

export const config = {
    API_BASE: undefined,
    get_token: undefined
}

// component styles
const styleSheet = new CSSStyleSheet()
styleSheet.replaceSync(`
:host {
    display: flex;
    flex-flow: column nowrap;
    gap: var(--space-06);
    max-height: 100%;
    min-height: 0;
    
    .wrapper {
        padding: var(--space-04);        
        border-radius: var(--borderRadiusXl);
        border: solid 1px var(--border-neutral-default3-l);
        
        
        max-height: 100%;
        overflow-y: auto;
        
        /* vertical gap between tags */
        component-input:not(:last-of-type) {
            margin-bottom: var(--space-02);
        }
    }
}

:host([loading]) {
    .wrapper {
        span.skeleton {
            display: inline-block;
            width: 100%;
            height: 2.2em;
            
            &::before, &::after {
                content: '';
                position: relative;
                display: inline-block;
                border-radius: var(--borderRadiusSm);
                background: #DDDDDD;
            }
            &::before { /* checkbox skeleton */
                width: 1em;
                height: 1em;
            }
            &::after { /* label skeleton */
                bottom: 10%;
                left: 2%;
                width: 30%;
                height: 26%;
            }
        }
    }
}`)

export class Tags extends HTMLElement {
    static formAssociated = true // to add support for form submission

    static observedAttributes = ["loading"]

    constructor() {
        super()

        let template = document.createElement("template")
        template.innerHTML = `
            <component-input type="text" id="newTagInput" label="Tags" placeholder="New tag" class="txt-body2" autocomplete="off"></component-input>
            <div id="wrapper" class="wrapper">
                <span class="skeleton"></span>
                <span class="skeleton"></span>
                <span class="skeleton"></span>
                <span class="skeleton"></span>
                <span class="skeleton"></span>
                <span class="skeleton"></span>
                <span class="skeleton"></span>
            </div>`
        // add skeleton loading state
        this.setAttribute("loading", "")

        // attach shadow dom to the component
        this.attachShadow({mode: "open"})
            .appendChild(template.content.cloneNode(true))

        // shadow dom nodes references
        this.nodeNewTagInput = this.shadowRoot.getElementById("newTagInput")
        this.nodeWrapper = this.shadowRoot.getElementById("wrapper")

        // attach internals for form participation
        this._internals = this.attachInternals()

        // active tags
        this.tags = []
    }

    attributeChangedCallback(name, oldVal, newVal) {
        switch (name){
            // remove skeleton loading on load
            case "loading":
                if (newVal === null) {
                    this.nodeWrapper.querySelectorAll("span.skeleton").forEach((span) => {
                        span.remove()
                    })
                }
        }
    }

    async connectedCallback() {
        this.shadowRoot.adoptedStyleSheets.push(styleSheet)

        // start fetching tags and store the promise
        this.fetchRenderTags()
            .then(() => {
                this.removeAttribute("loading")
                this.setAttribute("loaded", "")
            })

        // show hint on new tag input on focus
        this.nodeNewTagInput.addEventListener("focus", () => {
            this.nodeNewTagInput.message("info", "Press <kbd>Enter</kbd> to add tag")
        })
        // add new tag event
        this.nodeNewTagInput.addEventListener("keydown", async (ev) => {
            if (ev.key !== "Enter" || !this.nodeNewTagInput.value) return

            // avoid adding new tags until all others have loaded
            if (!this.hasAttribute("loaded")) {
                this.nodeNewTagInput.message("error", "Try again when all tags have loaded")
                return
            }

            // add tag to list and have it checked
            try {
                let tag = this.addTag(this.nodeNewTagInput.value)
                tag.dispatchEvent(new Event("change"))
            } catch (e) {
                this.nodeNewTagInput.message("error", e)
            }
        })
    }


    addTag(tag) {
        // check for similar tags
        this.shadowRoot.querySelectorAll("component-input[type='checkbox']").forEach(tagInput => {
            if (tagInput.value.toLowerCase() === tag.toLowerCase()) {
                if (!tagInput.hasAttribute("checked")) {
                    tagInput.dispatchEvent(new Event("change"))
                }
                throw "Tag already exists"
            }
        })

        // create new component
        const input = document.createElement("component-input")
        input.setAttribute("name", tag)
        input.setAttribute("type", "checkbox")
        input.setAttribute("label", tag)
        input.setAttribute("value", tag)
        input.classList.add("txt-body2")

        // append tags above skeleton spans (if they exist)
        this.nodeWrapper.insertBefore(input, this.nodeWrapper.querySelector("span.skeleton:first-of-type"))


        // listen for changes on the checkbox and sync with the form internals
        input.addEventListener("change", () => {
            const val = input.value
            const set = new Set(this.value)

            input.hasAttribute("checked") ? set.add(val) : set.delete(val)

            this.value = [...set]
            this.dispatchEvent(new Event("change"))
        })


        return input
    }

    /**
     * @method fetchRenderTags
     * @description
     * Fetches the list of tags from the API, sorts them alphabetically,
     * and dynamically renders a checkbox input for each using <component-input>.
     *
     * This method also registers `input` event listeners on each checkbox
     * to maintain an up-to-date internal `tags` array reflecting the current selection.
     * A `change` event is dispatched on each update to support parent components
     * or forms reacting to selection changes.
     *
     * Errors during the fetch phase are logged and rethrown for upper-layer interception.
     *
     * @returns {Promise<void>} Resolves when tags are rendered. Rejects on fetch or parse failure.
     *
     * @throws {Error} Throws an error if the network request fails or the response is invalid.
     */
    async fetchRenderTags() {
            await new Promise(resolve => setTimeout(resolve, 2000)).then(() => {
                let a;
            })
        // fetch tags
        let tags
        try {
            // make request to server
            const response = await fetch(`${config.API_BASE}/tags`, {
                headers: {
                    "Content-Type": "application/json"
                }
            })

            // error handle
            if (!response.ok) {
                throw new Error("Failed to fetch tags")
            }

            const data = await response.json()
            tags = data.tags
        } catch (err) {
            console.error("[fetchRenderTags]", err)
            throw err
        }

        // sort tags alphabetically
        tags.sort((a, b) => a.localeCompare(b, undefined, {sensitivity: "base"}))

        // populate DOM
        tags.forEach(tag => {
            try {
                this.addTag(tag)
            } catch (e) {}
        })
    }

    get value() {
        return this.tags
    }

    set value(val) {
        if (!Array.isArray(val)) throw new TypeError("Tags value must be an array")

        // update the tags state and form value
        this.tags = val
        this._internals.setFormValue(val)

        // check the boxes and add any tags that don't already exist
        val.forEach((tag) => {
            try {
                this.addTag(tag).dispatchEvent(new Event("change"))
            } catch (e) {}
        })
    }
}