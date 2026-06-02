import json

# ==============================================================================================
# This can hopefully register our tool in canvas
#
# See API-docs:
# https://developerdocs.instructure.com/services/canvas/external-tools/lti/file.registration
#
# ==============================================================================================


# Whatever stable domain we have...
DOMAIN = "https://xxx.ngrok.app"


tool_cfg = {
    # primary domain
    "domain": DOMAIN.removeprefix("https://"),
    "description": "A simple 'Backend For Frontend' for browser based programming quiz",
    # default launch url when not defined in message
    "target_link_uri": f"{DOMAIN}/lti/launch",
    # supported messages (Empty can be fine?)
    "messages": [
        {
            "type": "LtiResourceLinkRequest",
            "label": "CTM Quiz",
            "custom_parameters": {"foo": "bar", "context_id": "$Context.id"},
            "placements": [{"placement": "assignment_selection"}],
            "roles": [],
            "target_link_uri": f" {DOMAIN}/lti/launch?placement=assignment_selection",
        }
    ],
    # What claims to include in each launch token
    "claims": ["sub", "iss", "name"],
}

scopes = [
    "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly",
    # create/manage gradebook column
    "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
    # submit student grades
    "https://purl.imsglobal.org/spec/lti-ags/scope/score",
]

registration = {
    "application_type": "web",
    # Name shown to administrators
    "client_name": "CTM Quiz BFF - dev",
    # Where should canvas initiate LTI launch
    "initiate_login_uri": f"{DOMAIN}/lti/login",
    # Where can the tool launch to
    "redirect_uris": [f"{DOMAIN}/lti/launch"],
    # Where to find the tool's keyset
    "jwks_uri": f"{DOMAIN}/.well-known/jwks.json",
    "token_endpoint_auth_method": "private_key_jwt",
    "grant_types": ["client_credentials", "implicit"],
    "response_types": ["id_token"],
    # space separated list of requested scopes
    "scope": " ".join(scopes),
    "https://purl.imsglobal.org/spec/lti-tool-configuration": tool_cfg,
}

print(json.dumps(registration, indent=2))
