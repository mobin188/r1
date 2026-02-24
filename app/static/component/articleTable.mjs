"use strict"

import {getToken} from "../utils/auth.js"
let {config: API_BASE} = await import("../utils/config.js")
API_BASE = API_BASE.API_BASE

// component styles
const styleSheet = new CSSStyleSheet()
styleSheet.replaceSync(`
:host {
    flex: 1 1;
    
    display: flex;
    flex-flow: column nowrap;
    align-items: flex-end;
    gap: var(--space-02);
    min-height: 0;
    max-height: 100%;
    min-width: 850px;
    
    /*#wrapperTable {*/
    /*    flex: 1 1;*/
    /*    width: 100%;*/
    /*    max-height: 100%;*/
    /*    overflow-y: auto;*/
        table {
            display: flex;
            flex-flow: column nowrap;
            max-height: 100%;
            min-height: 0;
            overflow-y: auto;
            
            width: 100%;
            /*border-collapse: collapse;*/
            /*border-spacing: 0;*/
            
            tr {
                display: flex;
                flex-flow: row nowrap;
                align-items: center;
            }
            
            th, td {
                padding: var(--space-03) var(--space-03);
                text-align: start;
                
                &.colNo {
                    text-align: center;
                    flex: 0 1 48px;
                }
                &.colTitle {
                    flex: 1 0;
                    max-width: 120px;
                }
                &.colAuthor {
                    flex: 1 1;
                    max-width: 192px;
                }
                &.colTags {
                    flex: 1 1;
                    max-width: 112px;
                }
                &.colExcerpt {
                    flex: 1 1;
                }
                &.colCreated {
                    flex: 1 1;
                    max-width: 120px;
                }
                &.colOptions {
                    padding-top: var(--space-01);
                    padding-bottom: var(--space-01);
                }
            }
            
            thead {
                position:sticky;
                top: 0;
                z-index: 1;
                
                background: var(--bg-neutral-default-2-l);
                border-collapse: collapse;
                border-bottom: solid 1px var(--border-neutral-default3-l);
                
                /*tr {*/
                /*    display: flex;*/
                /*    flex-flow: row nowrap;*/
                /*    align-items: center;*/
                /*}*/
                
                /*th {*/
                /*    padding: var(--space-03) var(--space-03);*/
                /*    !*padding: var(--space-03) 0;*!*/
                /*    */
                /*    text-align: start;*/
                /*    */
                /*    &#thNo {*/
                /*        text-align: center;*/
                /*        flex: 0 1 48px;*/
                /*    }*/
                /*    &#thTitle {*/
                /*        flex: 1 1;*/
                /*        max-width: 120px;*/
                /*    }*/
                /*    &#thAuthor {*/
                /*        flex: 1 1;*/
                /*        max-width: 192px;*/
                /*    }*/
                /*    &#thTags {*/
                /*        flex: 1 1;*/
                /*        max-width: 112px;*/
                /*    }*/
                /*    &#thExcerpt {*/
                /*        flex: 1 1;*/
                /*    }*/
                /*    &#thCreated {*/
                /*        flex: 1 1;*/
                /*        max-width: 120px;*/
                /*    }*/
                /*    &#thOptions {*/
                /*        padding-top: 0;*/
                /*        padding-bottom: 0;*/
                /*        !*flex: 1 1;*!*/
                /*        !*&::after {*!*/
                /*        !*    content: "dd";*!*/
                /*        !*}*!*/
                /*    }*/
                }
            }
            
            tbody {
                tr {
                    border-bottom: solid 1px var(--border-neutral-default3-l);
                }
                td {
                    // padding: var(--space-02);
                    
                    /*.no-wrapper {*/
                    /*    text-align: center;*/
                    /*    background: var(--bg-neutral-default-2-l);*/
                    /*    border-radius: var(--borderRadiusSm);*/
                    /*    aspect-ratio: 1/1;*/
                    /*    padding: var(--space-02); !* visual alignment *!*/
                    /*    */
                    /*    display: flex;*/
                    /*    justify-content: center;*/
                    /*    align-items: center;*/
                    /*}*/
                    &.td-article-options {
                        position: relative;
                        
                        .options {
                            position: absolute;
                            right: 0;
                            top: 50%;
                            transform: translate3d(-8%, 22%, 0);
                            z-index: 1;
                            
                            display: flex;
                            flex-flow: column nowrap;
                            align-items: flex-start;
                            padding: var(--space-02) 0;
                            
                            overflow: hidden;                        
                            visibility: hidden;
                            opacity: 0;
                            transition: 200ms;
                            
                            background-color: var(--bg-neutral-default-1-l);
                            border-radius: var(--borderRadiusLg);
                            box-shadow: 0 4px 16px hsla(0, 0%, 0%, .16);
                            
                            button, a {
                                width: 100%;
                                text-align: start;
                                padding: var(--space-01) var(--space-10) var(--space-02) var(--space-04);
                                cursor: pointer;
                                transition: 250ms;
                                
                                opacity: 1;
                                color: inherit;
                                
                                 &:hover, &:focus-visible {
                                    background: #EEEEEE;
                                 }
                                 &:active {
                                    background: #AAAAAA;
                                 }
                            }
                            
                            &.expanded {
                                visibility: visible;
                                opacity: 1;
                                transform: translate3d(-8%, 25%, 0);
                                
                                button, a {
                                    padding-top: var(--space-02);
                                    opacity: 1;
                                    
                                    &:nth-of-type(1) {
                                        transition: 250ms, padding-top 150ms, opacity 250ms;
                                    }
                                    &:nth-of-type(2) {
                                        transition: 250ms, padding-top 300ms, opacity 450ms;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    /*}*/
}
`)

export class ArticleTable extends HTMLElement {
    static observedAttributes = ["page"]

    constructor() {
        super()

        this.page = 1
        this.perPage = 10

        // component template
        let template = document.createElement("template")
        template.innerHTML = `
<!--            <div id="wrapperTable">-->
                <table>
                    <thead>
                        <tr>
                            <th id="thNo" class="txt-title3 colNo">#</th>
                            <th id="thTitle" class="txt-title3 colTitle">Title</th>
                            <th id="thAuthor" class="txt-title3 colAuthor">Author</th>
                            <th id="thTags" class="txt-title3 colTags">Tags</th>
                            <th id="thExcerpt" class="txt-title3 colExcerpt">Excerpt</th>
                            <th id="thCreated" class="txt-title3 colCreated">Created</th>
                            <th id="thOptions" class="colOptions">
                                <component-button type="button" class="secondary btn-article-options" icon>
                                    <svg width="19" height="4" viewBox="0 0 19 4" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.15858 0C3.35073 0 4.31716 0.89543 4.31716 2C4.31716 3.10457 3.35073 4 2.15858 4C0.966429 4 0 3.10457 0 2C0 0.89543 0.966429 0 2.15858 0Z" fill="#333333"/><path d="M9.5 0C10.6922 0 11.6586 0.89543 11.6586 2C11.6586 3.10457 10.6922 4 9.5 4C8.30785 4 7.34142 3.10457 7.34142 2C7.34142 0.89543 8.30785 0 9.5 0Z" fill="#333333"/><path d="M16.8414 0C18.0336 0 19 0.89543 19 2C19 3.10457 18.0336 4 16.8414 4C15.6493 4 14.6828 3.10457 14.6828 2C14.6828 0.89543 15.6493 0 16.8414 0Z" fill="#333333"/></svg>
                                </component-button>
                            </th>
                        </tr>
                    </thead>
                    <tbody id="tbody"></tbody>
                </table>
<!--            </div>-->
            <component-pagination id="pager" perpage="10"></component-pagination>`

        // attach shadow dom
        this.attachShadow({mode: "open"})
            .appendChild(template.content.cloneNode(true))

        // nodes reference
        this.nodeTbody = this.shadowRoot.getElementById("tbody")
        this.pager = this.shadowRoot.getElementById("pager")

        // wire pagination events
        this.pager.addEventListener("page-change", (e) => {
            this.setAttribute("page", e.detail.page)
        })
    }

    connectedCallback() {
        // apply styles
        this.shadowRoot.adoptedStyleSheets.push(styleSheet)
    }

    // TODO - remove all event listeners on disconnect
    // disconnectedCallback() {
    //     this.pager.removeEventListener('page-change')
    // }

    async attributeChangedCallback(name, _, newVal) {
        if (name === "page") {
            this.nodeTbody.style.opacity = '.5'
            // this.pager.setAttribute("disabled")
            const newPage = parseInt(newVal || "1", 10)
            await this.render(newPage)
            this.nodeTbody.style.opacity = '1'

        }
    }

    async fetchArticles(page = 1) {
        let offset = (page - 1) * this.perPage
        const token = getToken?.()
        try {
            if (!token) throw new Error("You're not allowed to view articles", {cause: {
                    code: "unauthorized",
                    title: "Unauthorized!",
                    caption:"You're not allowed to view articles"}})

            const res = await fetch(
                `${API_BASE}/articles?limit=${this.perPage}&offset=${offset}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Token ${token}`
                    }
                }
            )

            // if (!res.ok) throw new Error(["Failed to load articles", "Try re-loading the page"])
            if (!res.ok) throw new Error("Failed to fetch articles", {cause: {
                    code: "fetchFail",
                    title: "Fetching articles failed",
                    caption:"Try re-loading the page"}})
            const {articles, articlesCount} = await res.json()

            if (!articles.length) {
                this.nodeTbody.innerHTML = `<tr><td colspan="7">No articles found</td></tr>`
                throw new Error("Failed to fetch articles", {cause: {
                    code: "noArticles",
                    title: "No articles found",
                    caption: "You can <a href='/articles/create' data-route>write one</a>"}})
            }

            return {articles, articlesCount}
        } catch (e) {
            throw e
        }
    }

    async render(page = 1) {
        const offset = (page - 1) * this.perPage

        try {
            let {articles, articlesCount} = await this.fetchArticles(page)

            // pagination setup
            this.pager.setAttribute("page", page)
            this.pager.setAttribute("total", articlesCount)

            // inject articles into table
            this.nodeTbody.innerHTML = articles.map((a, i) => `
                <tr>
                    <td class="colNo"><strong class="txt-caption1 no-wrapper">${offset + i + 1}</strong></td>
                    <td class="title txt-body1 colTitle">${a.title}</td>
                    <td class="author colAuthor">@${a.author.username}</td>
                    <td class="tag-list colTags">${a.tagList.map(tag => `<span>#${tag}</span>`).join(" ")}</td>
                    <td class="excerpt colExcerpt">${a.body.split(" ").slice(0, 20).join(" ")}...</td>
                    <td class="colCreated">${new Date(a.createdAt).toLocaleDateString()}</td>
                    <td class="td-article-options colOptions">
                        <component-button type="button" class="secondary btn-article-options" aria-label="Article ${offset + i + 1} options" icon>
                            <svg width="19" height="4" viewBox="0 0 19 4" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.15858 0C3.35073 0 4.31716 0.89543 4.31716 2C4.31716 3.10457 3.35073 4 2.15858 4C0.966429 4 0 3.10457 0 2C0 0.89543 0.966429 0 2.15858 0Z" fill="#333333"/>
                            <path d="M9.5 0C10.6922 0 11.6586 0.89543 11.6586 2C11.6586 3.10457 10.6922 4 9.5 4C8.30785 4 7.34142 3.10457 7.34142 2C7.34142 0.89543 8.30785 0 9.5 0Z" fill="#333333"/>
                            <path d="M16.8414 0C18.0336 0 19 0.89543 19 2C19 3.10457 18.0336 4 16.8414 4C15.6493 4 14.6828 3.10457 14.6828 2C14.6828 0.89543 15.6493 0 16.8414 0Z" fill="#333333"/>
                            </svg>
                        </component-button>
                        <div class="options" data-slug="${a.slug}">
                            <a href="/articles/edit/${a.slug}" class="txt-body2 btn-option-edit" data-route>Edit</a>                        
                            <button type="button" class="txt-body2 btn-option-delete" data-delete>Delete</button>                        
                        </div>
                    </td>
                </tr>
            `).join("")

            // option button event listener
            this.nodeTbody.querySelectorAll("component-button.btn-article-options").forEach((btn) => {
                btn.addEventListener("click", () => {
                    // close any previously opened options menu
                    this.nodeTbody.querySelectorAll(".options.expanded").forEach((menu) => {
                        menu !== btn.nextElementSibling && menu.classList.remove("expanded")
                    })

                    // expand options
                    btn.nextElementSibling.classList.toggle("expanded")
                })
            })

            // delete option event listener
            this.nodeTbody.querySelectorAll("button[data-delete]").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    // expand delete modal
                    const modalMessage = {
                        danger: true,
                        title: "Delete Article",
                        message: "Are you sure you want to delete this article?"
                    }
                    modal.expand(modalMessage)

                    // delete cta listener
                    modal.addEventListener("delete", async () => {
                        try {
                            // make delete request to server
                            await this.articleDelete(btn.parentElement.dataset.slug)
                            window.toast.message("success", "Done!", "Article deleted")

                            // re-render the table
                            void this.render(this.page)
                        } catch (e) {
                            console.error(e)
                            window.toast.message("error", "Failed to delete", e.message)
                        } finally {
                            modal.collapse()
                        }
                    }, {once: true})
                    // cancel cta listener
                    modal.addEventListener("cancel", () => {
                        modal.collapse()
                    }, {once: true})
                })
            })
        } catch (e) {
            console.error(e.cause.code); console.log(e)
            // console.error(e)
            e.cause.code !== "noArticles" && toast.message("error", e.cause.title, e.cause.caption)
        }
    }


    /**
     * Deletes an article by slug.
     * @param {string} slug - The unique identifier for the article.
     * @returns {Promise<void>}
     */
    async articleDelete(slug) {
        if (!API_BASE || typeof API_BASE !== "string") throw new Error("Invalid API_BASE")
        if (!slug || typeof slug !== "string") throw new Error("Invalid slug")
        if (!getToken()) throw new Error("Missing auth token")

        const url = `${API_BASE}/articles/${encodeURIComponent(slug)}`

        const res = await fetch(url, {
            method: "DELETE",
            headers: {
                "Authorization": `Token ${getToken()}`
            }
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.message || "Failed to delete article")
        }

        return true
    }
}

customElements.define("article-table", ArticleTable)