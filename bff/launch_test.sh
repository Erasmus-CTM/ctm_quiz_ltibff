#!/usr/bin/env bash

# ============================================================
# Test script, run like ./launch_test.sh, from the bff/ dir
# ============================================================

set -euo pipefail

# --- CONFIGURATION ---
APP_PORT=3000
MOCK_CANVAS_PORT=3001
APP_URL="http://localhost:$APP_PORT"
MOCK_CANVAS_URL="http://localhost:$MOCK_CANVAS_PORT"



echo "=== 1. Starting Server in Test Mode ==="

sleep 1

NODE_ENV=test PORT=$APP_PORT yarn run dev &
APP_PID=$!
echo "bff server running with pid:$APP_PID"
# Ensure we clean up the background processes when the script exits
cleanup() {
  echo "=== Cleaning up servers ==="
  kill $APP_PID || true
}
trap cleanup EXIT

echo "Waiting for application server to respond..."
until $(curl --output /dev/null --silent --head --fail "$APP_URL/health"); do
    printf 'a'
    sleep 1
done
echo " LTI app Online!"

echo "Waiting for mock canvas server to respond..."
until $(curl --output /dev/null --silent --head --fail "$MOCK_CANVAS_URL/health"); do
    printf 'c'
    sleep 1
done
echo " Mock canvas Online!"



echo -e "\n=== 3. Executing LTI Login Initiation Request ==="
# Simulate Canvas hitting your OIDC login initiation route
LOGIN_INIT_RES=$(curl -s -i -X POST "$APP_URL/lti/login" \
  --data-urlencode "iss=$MOCK_CANVAS_URL" \
  --data-urlencode "login_hint=user-456" \
  --data-urlencode "target_link_uri=$APP_URL/lti")

# Extract the 302 Location header pointing to your Canvas instance
REDIRECT_URL=$(echo "$LOGIN_INIT_RES" | grep -i "location:" | awk '{print $2}' | tr -d '\r')

echo "App Redirected to Platform: $REDIRECT_URL"


printf "\n\n=== 3. Check JWKS ===\n"

curl -s "$MOCK_CANVAS_URL/lti/jwks" | jq

printf "\n\n=== 4. Requesting signed ID Token from Mock Canvas ===\n"
# Ask your mock server to sign an ID Token containing the required 'state'
# parsing from the redirect parameters.
NONCE=$(echo "$REDIRECT_URL" | grep -oP 'nonce=\K[^&]+')
STATE=$(echo "$REDIRECT_URL" | grep -oP 'state=\K[^&]+')

printf "\nNONCE=$NONCE\n"
printf "STATE=$STATE\n\n"

JWT_PAYLOAD=$(curl -s -X POST "$MOCK_CANVAS_URL/lti/authorize?nonce=$NONCE" \
  -H "Content-Type: application/json" \
  -d '{
    "state": "'"$STATE"'",
    "clientId": "mock-client-id-12345",
    "iss": "'"$MOCK_CANVAS_URL"'",
    "redirect_uri": "localhost:5173/quiz"
  }')

printf "\n\nJWT_PAYLOAD=$JWT_PAYLOAD\n\n"

# If it is json we can get the token:
# ID_TOKEN=$(echo "$JWT_PAYLOAD" | jq -r '.id_token')

# If it is a form (more realistic?) we can extract the token
ID_TOKEN=$(echo "$JWT_PAYLOAD"| grep -oE 'name="id_token" value=".+"' | sed 's|name="id_token" value="||' | sed 's|"$||')
printf "\n\nID_TOKEN=$ID_TOKEN\n\n"

echo "Decoded ID token"
echo $ID_TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq

printf "\n\n=== 5. Performing the Final LTI Launch Request ===\n"
# POST the generated token back to your application route
LAUNCH_RES=$(curl -s -i -X POST "$APP_URL/lti?ltik=$ID_TOKEN" \
  --data-urlencode "id_token=$ID_TOKEN" \
  --data-urlencode "state=$STATE")



# --- ASSERTIONS ---
printf "\n\n=== 6. Validating Assertions ===\n"
HTTP_STATUS=$(echo "$LAUNCH_RES" | grep "HTTP/" | awk '{print $2}')

if [ "$HTTP_STATUS" == "302" ]; then
  FINAL_LOCATION=$(echo "$LAUNCH_RES" | grep -i "location:" | awk '{print $2}')
  if [[ "$FINAL_LOCATION" == *"context="* ]]; then
    echo "✅ SUCCESS: LTI Launch was successfully validated! App redirected to: $FINAL_LOCATION"
    exit 0
  else
    echo "🔥 FAILED: Redirected, but query parameters were missing. Response: $FINAL_LOCATION"
    exit 1
  fi
else
  echo "🔥 FAILED: Expected HTTP status 302, got $HTTP_STATUS"
  echo "$LAUNCH_RES"
  exit 1
fi