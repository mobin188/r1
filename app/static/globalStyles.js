const globalStyles = new CSSStyleSheet();
globalStyles.replaceSync(`
    :root {
        --lineHeight: 20px;

        --space-01: 4px;
        --space-02: 8px;
        --space-03: 12px;
        --space-04: 16px;
        --space-05: 20px;
        --space-06: 24px;
        --space-07: 28px;
        --space-08: 32px;
        --space-09: 36px;
        --space-10: 40px;

        --borderRadiusSm: 4px;
        --borderRadiusMd: 8px;
        --borderRadiusLg: 12px;
        --borderRadiusXl: 16px;

        --bg-neutral-l: #F0F0F0;
        --bg-error-default-1-l: #FAE4E4;
        --color-error-default-1-l: #D61E20;
        --bg-success-default-1-l: #E3F6E9;
        --color-success-default-1-l: #17B24A;

        /* TODO - Too many re-occurrences of the same values in multiple different variables. Refactor! */
        /* PRIMARY */
        --bg-primary-default-1-l: #E0F7F7;
        --bg-primary-hover-1-l: #D6F4F4;
        --color-primary-default-1-l: #009595;
        --color-primary-hover-1-l: #007070;

        --bg-primary-default-2-l: #009595;
        --bg-primary-hover-2-l: #007070;
        --bg-primary-active-2-l: #004A4A;
        --bg-primary-disabled-2-l: #99E3E3;

        /* NEUTRAL */
        --bg-neutral-default-1-l: #FFFFFF;
        --bg-neutral-hover-1-l: #F0F0F0;
        --bg-neutral-active-1-l: #EBEBEB;

        --border-neutral-default-1-l: #7F7F7F;
        --border-neutral-hover-1-l: #666666;
        --border-neutral-active-1-l: #4C4C4C;
        --border-neutral-disabled-1-l: #CCCCCC;

        --color-neutral-default-l: #333333;
        --color-neutral-hover-l: #191919;
        --color-neutral-focus-l: #000000;
        --color-neutral-disabled-l: #CCCCCC;

        --bg-neutral-default-2-l: #F0F0F0;

        --color-neutral-default-2-l: #7F7F7F;

        --border-neutral-default-2-l: #CCCCCC;
        --border-neutral-hover2-l: #B3B3B3;
        --border-neutral-focus2-l: #999999;

        --color-neutral-default-3-l: #FFFFFF;
        --border-neutral-default3-l: #E6E6E6;

        /* INFO */
        --color-info-default-1-l: #0172B4;
        --color-info-hover-1-l: #015687;
        --color-info-focus-1-l: #00395A;
        --color-info-disabled-1-l: #99D2F3;

        /* ERROR */
        --bg-error-default-2-l: #D61E20;
        --bg-error-hover-2-l: #AB181A;
        --bg-error-active-2-l: #801213;
    }
    * {
        box-sizing: border-box;
    }

    h1, h2, h3, h4, h5, h6 {
        margin: 0 !important;
    }

    h3, .txt-title3 {
        font-size: 18px;
        font-weight: 600;
        line-height: 24px;
    }

    .txt-body1 {
        font-size: 16px;
        font-weight: 600;
        line-height: 24px;
    }

    .txt-body2 {
        font-size: 14px;
        font-weight: 400;
        line-height: 20px;
    }
    strong.txt-body2, .txt-body2.strong {
        font-weight: 600;
    }

    .txt-caption1 {
        font-size: 12px;
        line-height: 16px;
        font-weight: 400;
    }
    strong.txt-caption1, .txt-caption1.strong {
        font-weight: 600;
    }

    :host {
        /* font-family: "Inter", sans-serif; */
        font-size: 14px;

        /* navbar */
        --bg-navbar: #FFFFFF;

        /* input */
        --inputPadInlineStart: 1rem;
        --inputPadInlineEnd: 1rem;
        --inputPad: 8px;
        --inputGap: 8px;

        --border-input-active-l: #009595;
        --color-input-active-l: #333333;

        --border-input-readonly-l: #7F7F7F;
        --color-input-readonly-l: #333333;

        --border-input-error-l: #D61E20;


        /* button */
        --btnPadInlineStart: 16px;
        --btnPadInlineEnd: 16px;
        --btnPadTop: 10px;
        --btnPadBottom: 10px;

        --btn-color-primary-default: #FFFFFF;
        --btn-bg-primary-default: #009595;
        /*--btn-border-primary-default: #009595;*/
        --btn-bg-primary-hover: #007070;
        --btn-bg-primary-focus: #004A4A;

        /* toast */
        --toastPadInlineStart: 16px;
        --toastPadInlineEnd: 16px;
        --toastPadTop: 12px;
        --toastPadBottom: 12px;
    }

    input, button {
        box-shadow: none;
        background: none;
        padding: 0;
        border: none;
        outline: none;

        font-weight: inherit;
        font-family: inherit;
        line-height: inherit;
    }

    a {
        color: var(--color-info-default-1-l);
        text-decoration: none;

        &:hover, &:focus-visible {
            color: var(--color-info-hover-1-l);
        }
        &:active {
            color: var(--color-info-focus-1-l);
        }
    }

    section {
        display: flex;
        flex-flow: column nowrap;

        background: var(--bg-neutral-default-1-l);
        border-radius: var(--borderRadiusMd);

        transition: width 300ms; /* resize animation */

        .header, .body {
            padding-left: 24px;
            padding-right: 24px;
        }

        .header {
            padding-top: 38px;
            padding-bottom: 38px;
            border-bottom: solid 1px hsl(0, 0%, 90%);
        }

        .body {
            flex: 1 1;
            display: flex;
            flex-flow: column nowrap;
            min-height: 0;

            padding-top: 24px;
            padding-bottom: 24px;
        }

    }
`);


// Apply to main document
document.adoptedStyleSheets = [
    globalStyles,
    ...(document.adoptedStyleSheets || [])
];

// Patch attachShadow to apply styles to every web component
const originalAttachShadow = Element.prototype.attachShadow;

Element.prototype.attachShadow = function (init) {
    const shadowRoot = originalAttachShadow.call(this, init);

    if (init.mode === 'open' || init.mode === 'closed') {
        shadowRoot.adoptedStyleSheets = [
            globalStyles,
            ...(shadowRoot.adoptedStyleSheets || [])
        ];
    }

    return shadowRoot;
};
