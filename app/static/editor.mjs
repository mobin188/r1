// import config
import {config} from "./utils/config.js"

// router and auth management
import { redirectIfNotAuthenticated, withSubmitLock} from "./utils/auth.js"

import {Tags, config as configTags} from "./component/tags.mjs"
configTags.API_BASE = config.API_BASE
customElements.define("component-tags", Tags)

import {Editor, config as configEditor} from "./component/editor.mjs"
configEditor.API_BASE = config.API_BASE
configEditor.withSubmitLock = withSubmitLock
customElements.define("component-editor", Editor)