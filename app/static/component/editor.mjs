"use strict"

import {getToken} from "../utils/auth.js";

export const config = {
    API_BASE: undefined,
    withSubmitLock: undefined,
    // redirectIfNotAuthenticated: undefined,
}

// component styles
const styleSheet = new CSSStyleSheet()
styleSheet.replaceSync(`
:host {
    flex: 1 1;
    display: flex;
    
    form {
        flex: 1 1;
        display: flex;
        flex-flow: row wrap;        
        gap: var(--space-06);
    }
    
    section {
        height: max-content;
        
        .body {
            gap: var(--space-06);
        }
        
        &#editor {
            flex: 2 1;
        }
        &#tags {    
            flex: 1 1;
            
            display: flex;
            max-height: 100%;    
        }
    }
}
`)

export class Editor extends HTMLElement {
    // static formAssociated = true // to add support for form submission

    static observedAttributes = ["type"]

    constructor() {
        super()

        // attach shadow dom to the component
        this.attachShadow({mode: "open"}).innerHTML = `
            <form id="formEditor">
                <section id="editor">
                    <div class="header"></div>
                    <div class="body">
                            <component-input name="title" label="Title" type="text" class="txt-body2" placeholder="Title"
                                             required></component-input>
                            <component-input name="description" label="Description" type="text" class="txt-body2"
                                             placeholder="Description" required></component-input>
                            <component-input name="body" label="Body" type="textarea" class="txt-body2" rows="10"
                                             required></component-input>
                            <component-button id="submitButton" class="txt-body2 strong" type="submit">Submit</component-button>
                        </div>
                </section>
                <section id="tags">
                    <div class="body">
                            <component-tags name="tags"></component-tags>
                        </div>
                </section>
            </form>
        `

        this.nodeForm = this.shadowRoot.getElementById("formEditor")
        this.nodeSubmit = this.shadowRoot.getElementById("submitButton")
        this.nodeTags = this.shadowRoot.querySelector("component-tags")
        this.nodeTitle = this.nodeForm.querySelector("component-input[name='title']")
        this.nodeDescription = this.nodeForm.querySelector("component-input[name='description']")
        this.nodeBody = this.nodeForm.querySelector("component-input[name='body']")
    }

    attributeChangedCallback(name, oldVal, newVal) {
        switch (name) {
            case "type":
                if (newVal === "create") {
                    this.initNewArticle()
                }

                if (newVal === "edit") {
                    void this.initEditArticle(this.getAttribute("slug"))
                }
        }
    }

    connectedCallback() {
        // apply styles
        this.shadowRoot.adoptedStyleSheets.push(styleSheet)

        // form event submission
        // this.nodeForm.addEventListener("submit", () => {
        //     this.dispatchEvent(new Event("submit"))
        // })
    }

    /**
     * Fetches a single article by its slug.
     * @param {string} slug - The unique slug of the article to retrieve.
     * @returns {Promise<Object>} The article data.
     * @throws {Error} If the fetch fails or the response is invalid.
     */
    async getArticle(slug) {
        if (!slug) throw new Error("Article slug is required")

        const response = await fetch(`${config.API_BASE}/articles/${encodeURIComponent(slug)}`, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Authorization": `Token ${getToken()}`
            }
        })

        if (!response.ok) {
            let errorJson = await response.json()
            errorJson = errorJson.errors
            throw errorJson
        }

        const {article} = await response.json()

        if (!article || typeof article !== "object") {
            throw new Error("Invalid article data format")
        }

        return article
    }

    initNewArticle() {
        // set title
        this.shadowRoot.querySelector("div.header").innerHTML = "<h3>New Article</h3>"

        // add listener for new article
        this.nodeForm.addEventListener("submit", config.withSubmitLock(this.nodeForm, async (_, signal) => {
            try {
                // validate user input
                const inputs = this.nodeForm.querySelectorAll("component-input")

                let hasError = false
                for (const input of inputs) {
                    if (!input.checkValidity()) {
                        input.message("error", input.validationMessage)
                        hasError = true
                    }
                }
                if (hasError) return

                // put submit button component in a loading state, to avoid resubmitting during the process
                this.nodeSubmit.setAttribute("loading", "")

                // organize the request
                const formData = new FormData(this.nodeForm)
                const article = {
                    title: formData.get("title")?.trim(),
                    description: formData.get("description")?.trim(),
                    body: formData.get("body")?.trim(),
                    tagList: this.nodeTags?.value ?? [],
                }

                // send request to create article
                const res = await fetch(`${config.API_BASE}/articles`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Token ${getToken()}`,
                    },
                    signal,
                    body: JSON.stringify({article})
                })

                // error handle
                if (!res.ok) {
                    const {errors} = await res.json().catch(() => ({}))
                    if (errors && typeof errors === "object") {
                        for (let [field, messages] of Object.entries(errors)) {
                            const el = this.nodeForm.querySelector(`component-input[name="${field}"]`)
                            if (el && typeof el.message === "function") {
                                el.message("error", messages.join(", "))
                            }
                        }
                    } else {
                        window.toast.message("error", "Failed to create article", res.status)
                    }
                    return
                }

                window.toast.message("success", "Article Created!", "Redirecting to all articles page")

                // redirect to article list
                setTimeout(() => {
                    history.pushState({}, "", "/articles")
                    window.dispatchEvent(new PopStateEvent("popstate"))
                }, 1000)
            } finally {
                this.nodeSubmit.removeAttribute("loading")
            }
        }))
    }

    async initEditArticle(slug) {
        // set title
        this.shadowRoot.querySelector("div.header").innerHTML = "<h3>Edit Article</h3>";

        // disable inputs until article is loaded
        [this.nodeTitle, this.nodeDescription, this.nodeBody]?.forEach(n => n?.setAttribute("disabled", ""))

        // get article data
        try {
            // request article data
            let article = await this.getArticle(slug)

            // inject article data into input nodes
            this.nodeTags.value = article.tagList

            this.nodeTitle.value = article.title
            this.nodeDescription.value = article.description
            this.nodeBody.value = article.body

            // enable inputs
            this.nodeTitle.removeAttribute("disabled")
            this.nodeDescription.removeAttribute("disabled")
            this.nodeBody.removeAttribute("disabled")
        } catch (e) {
            console.log(e)
            toast.message("error", "Failed to fetch article", `${Object.entries(e)[0][0]} ${Object.entries(e)[0][1]}`)
        }

        // edit form submit handle
        this.nodeForm.addEventListener("submit", config.withSubmitLock(this.nodeForm, async () => {
            try {
                // validate user input
                const inputs = this.nodeForm.querySelectorAll("component-input")

                let hasError = false
                for (const input of inputs) {
                    if (!input.checkValidity()) {
                        input.message("error", input.validationMessage)
                        hasError = true
                    }
                }
                if (hasError) return

                // put submit button component in a loading state, to avoid resubmitting during the process
                this.nodeSubmit.setAttribute("loading", "")

                // organize the request
                const formData = new FormData(this.nodeForm)
                const article = {
                    title: formData.get("title")?.trim(),
                    description: formData.get("description")?.trim(),
                    body: formData.get("body")?.trim(),
                    tagList: this.nodeTags?.value ?? [],
                }

                // send request to create article
                await this.updateArticle(slug, article)

                // const {article: created} = await res.json()
                window.toast.message("success", "Article Edited!", "Redirecting to all articles page")

                // redirect to article list
                setTimeout(() => {
                    history.pushState({}, "", "/articles")
                    window.dispatchEvent(new PopStateEvent("popstate"))
                }, 1000)
            } catch (e) {
                // form fields errors
                if (e.status === 422) {
                    const body = await e.content.json();
                    const {errors} = body;

                    // clear previous error messages
                    document.querySelectorAll(".field-error").forEach(el => el.textContent = "");

                    // display each field's error
                    for (const [field, messages] of Object.entries(errors)) {
                        const input = document.querySelector(`[name="${field}"]`);
                        if (input) {
                            const errorEl = input.closest(".field-wrapper")?.querySelector(".field-error");
                            if (errorEl) {
                                errorEl.textContent = messages.join(", ");
                            }
                        }
                    }
                } else if (e.status === 403) {
                    console.error(e)
                    window.toast.message('error', 'Forbidden', "You're not allowed to edit this article")
                } else {
                    console.error(e);
                    window.toast.message("error", "Unexpected error", e.message || "");
                }
            } finally {
                this.nodeSubmit.removeAttribute("loading")
            }
        }))
    }

    /**
     * Updates an existing article by slug.
     * @param {string} slug - The slug of the article to update.
     * @param {Object} payload - The updated article data.
     * @param {string} payload.title
     * @param {string} payload.description
     * @param {string} payload.body
     * @param {string[]} payload.tagList
     * @returns {Promise<Object>} The updated article.
     * @throws {Error} If the update fails.
     */
    async updateArticle(slug, payload) {
        if (!slug) throw new Error("Article slug is required")
        if (!payload || typeof payload !== "object") throw new Error("Payload must be an object")

        const response = await fetch(`${config.API_BASE}/articles/${encodeURIComponent(slug)}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${getToken()}`
            },
            body: JSON.stringify({article: payload})
        })

        // error formatting and handling
        if (!response.ok) {
            // check for server-sent error messages
            const errorData = await response.json().catch(() => ({}))

            throw {
                status: response.status,
                message: errorData?.message || `Failed to update article: ${response.status}`,
                content: errorData || null
            }
        }

        const {article} = await response.json()

        if (!article || typeof article !== "object") {
            throw new Error("Invalid response data format")
        }

        return article
    }

}