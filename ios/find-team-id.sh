#!/usr/bin/env bash
# Prints the Apple team ID(s) of the "Apple Development" signing certificates on this Mac.
# Xcode creates one when you pick your Team the first time (Signing & Capabilities).
set -euo pipefail
found=0
while IFS= read -r subject; do
  team=$(sed -n 's/.*OU *= *\([A-Z0-9]\{10\}\).*/\1/p' <<<"$subject")
  name=$(sed -n 's/.*CN *= *\([^,\/]*\).*/\1/p' <<<"$subject")
  if [[ -n "$team" ]]; then echo "Team ID: $team   ($name)"; found=1; fi
done < <(security find-certificate -a -c "Apple Development" -p 2>/dev/null \
          | awk '/BEGIN CERT/{c=""} {c=c $0 "\n"} /END CERT/{printf "%s", c | "openssl x509 -noout -subject"; close("openssl x509 -noout -subject")}')
if [[ $found == 0 ]]; then
  echo "No Apple Development certificate found. Open the project in Xcode once, pick your Team under"
  echo "Signing & Capabilities, run the app, then try again."
  exit 1
fi
