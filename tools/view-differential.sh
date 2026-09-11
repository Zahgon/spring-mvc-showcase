#!/bin/bash
# Renders every page through the running port and compares it byte for byte
# against the same page rendered by the original under Jetty.
#
#   tools/view-differential.sh <port> <golden> <outdir>
set -u
PORT="${1:-18081}"; GOLDEN="$2"; OUT="${3:-/tmp/view-diff}"
B="http://localhost:$PORT/spring-mvc-showcase"
J="$OUT/cookies.txt"
rm -rf "$OUT"; mkdir -p "$OUT"
curl -sS -c "$J" -o /dev/null "$B/"
emit() { label="$1"; shift; echo "### $label"; curl -sS -b "$J" -c "$J" -D - "$@"; echo; echo '---8<---'; }
{
  emit 'GET /' "$B/"
  emit 'GET /views/html' "$B/views/html"
  emit 'GET /views/viewName' "$B/views/viewName"
  emit 'GET /views/dataBinding/bar/apple' "$B/views/dataBinding/bar/apple"
  emit 'GET /redirect/uriTemplate' "$B/redirect/uriTemplate?account=a123&date=12-31-2011" -L
  emit 'GET /form' "$B/form"
  emit 'GET /fileupload' "$B/fileupload"
  emit 'GET /form ajax' "$B/form?ajaxRequest=true"
  emit 'GET /form xhr' "$B/form" -H 'X-Requested-With: XMLHttpRequest'
  emit 'GET /fileupload xhr' "$B/fileupload" -H 'X-Requested-With: XMLHttpRequest'
  emit 'GET /nosuchpath' "$B/nosuchpath"
  emit 'GET /async/callable/response-body' "$B/async/callable/response-body"
  emit 'GET /async/callable/view' "$B/async/callable/view"
  emit 'GET /async/callable/exception' "$B/async/callable/exception"
  emit 'GET /async/deferred-result/response-body' "$B/async/deferred-result/response-body"
  emit 'GET /messageconverters/json' "$B/messageconverters/json" -H 'Accept: application/json'
  emit 'GET /data/param?foo=bar' "$B/data/param?foo=bar"
} > "$OUT/migrated.txt"
curl -sS -b "$J" -c "$J" "$B/form" > "$OUT/form.html"
TOK=$(sed -n 's/.*name="_csrf" value="\([^"]*\)".*/\1/p' "$OUT/form.html")
{
  echo "### POST /form invalid"
  curl -sS -b "$J" -c "$J" -D - -X POST "$B/form" -d "_csrf=$TOK" \
    -d 'name=&age=abc&inquiry=comment&inquiryDetails=&subscribeNewsletter=false&_additionalInfo[mvc]=on&_additionalInfo[java]=on'
  echo; echo '---8<---'
} >> "$OUT/migrated.txt"
curl -sS -b "$J" -c "$J" -o /dev/null -X POST "$B/form" -d "_csrf=$TOK" \
  --data-urlencode 'name=Bob' -d 'age=30' --data-urlencode 'birthDate=1980-01-01' \
  --data-urlencode 'phone=(123) 456-7890' --data-urlencode 'currency=$4.20' \
  --data-urlencode 'percent=15%' -d 'inquiry=feedback' --data-urlencode 'inquiryDetails=hi there' \
  -d 'subscribeNewsletter=true' -d 'additionalInfo[mvc]=true' -d '_additionalInfo[mvc]=on' -d '_additionalInfo[java]=on'
{
  echo "### GET /form after successful post"
  curl -sS -b "$J" -c "$J" -D - "$B/form"
  echo; echo '---8<---'
} >> "$OUT/migrated.txt"
# The file upload goes through the container's own multipart parsing, so it is
# exercised against the real server rather than through MockMvc.
echo "hello upload" > "$OUT/upload.txt"
{
  echo "### POST /fileupload"
  curl -sS -b "$J" -c "$J" -D - -X POST "$B/fileupload?_csrf=$TOK" -F "file=@$OUT/upload.txt"
  echo; echo '---8<---'
  echo "### POST /fileupload ajax"
  curl -sS -b "$J" -c "$J" -D - -X POST "$B/fileupload?_csrf=$TOK" -F "file=@$OUT/upload.txt" -F 'ajaxUpload=true'
  echo; echo '---8<---'
  echo "### POST /fileupload empty"
  curl -sS -b "$J" -c "$J" -D - -X POST "$B/fileupload?_csrf=$TOK" -F 'file=@/dev/null;filename='
  echo; echo '---8<---'
} >> "$OUT/migrated.txt"

python3 tools/view-compare.py "$GOLDEN" "$OUT/migrated.txt"
