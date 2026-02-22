

# Update Moneybird Administration ID

## What's happening
The stored `MONEYBIRD_ADMINISTRATION_ID` does not match the administration linked to your access token, causing Moneybird to return a 404 error. You've now provided the correct ID: `403849436087715588`.

## Fix
1. Update the `MONEYBIRD_ADMINISTRATION_ID` secret with the value `403849436087715588`
2. Verify the connection works by calling the `moneybird-test-connection` edge function
3. No code changes needed -- the CORS fix, retry logic, and improved error messages are already in place from the previous update

## Technical Detail
- Use the `add_secret` tool to prompt for the updated `MONEYBIRD_ADMINISTRATION_ID`
- After updating, invoke `moneybird-test-connection` server-side to confirm connectivity before the user refreshes the page

