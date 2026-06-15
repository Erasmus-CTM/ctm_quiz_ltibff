// quick and dirty way to inject content in static html to serve


export function injectDisclaimer(html: string): string {
    let text = "This backend is a PROOF OF CONCEPT. Please review it and see the README.md.";
    const nodeEnv = process.env.NODE_ENV
    text += ` it is running with NODE_ENV ${nodeEnv}`;
    // inject disclaimer at top of body
    const disclaimer = `<div style="background:orange;color:black;padding:8px;font-weight:bold;">${text}</div>`;
    return html.replace(/<body[^>]*>/, `$&${disclaimer}`);

}

export function injectLtik(html: string, ltik: string): string {
    const submitUrl = `/lti/api/submit?ltik=${ltik}`
    return html.replace("__LTI_PLACEHOLDER__", submitUrl);
}