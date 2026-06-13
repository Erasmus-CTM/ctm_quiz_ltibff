import json
from pathlib import Path

# ==============================================================================================
# This can hopefully register our tool in canvas
# This uses the "old" manual json variant
#
# See API-docs:
# https://developerdocs.instructure.com/services/canvas/external-tools/lti/file.lti_dev_key_config
#
# ==============================================================================================


# whatever stable domain, with https
DOMAIN = "https://decade-rephrase-resubmit.ngrok-free.dev"

config = {
    # Name shown to administrators
    "title": "CTM Quiz BFF - manual",
    "description": "A simple Backend For Frontend for browser based programming quiz",
    # Where should canvas initiate LTI launch
    "oidc_initiation_url": f"{DOMAIN}/lti/login",
    # default launch url when not defined in message
    "target_link_uri": f"{DOMAIN}/lti/launch",
    "scopes": [
        "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly",
        # create/manage gradebook column
        "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
        # submit student grades
        "https://purl.imsglobal.org/spec/lti-ags/scope/score",
    ],
    "extensions": [
        {
            "domain": DOMAIN.removeprefix("https://"),
            "tool_id": "ctm-quiz-bff-dev",
            "platform": "canvas.instructure.com",
            "privacy_level": "public",
            "settings": {
                "text": "CTM Quiz",
                "placements": [
                    {
                        "placement": "assignment_selection",
                        "message_type": "LtiDeepLinkingRequest",
                        "target_link_uri": f"{DOMAIN}/lti/launch?placement=assignment_selection",
                        "text": "CTM Quiz",
                        "custom_fields": {"foo": "bar", "context_id": "$Context.id"},
                    }
                ],
            },
        }
    ],
    # Where to find the tool's keyset
    "public_jwk_url": f"{DOMAIN}/.well-known/jwks.json",
}
Path("registration_cfg_manual.json").write_text(json.dumps(config, indent=2))
