#!/bin/bash
export BASE="https://localhost"
export CURL_CMD="curl -sk"
export RESULTS_FILE="/tmp/results.txt"
export PASS_COUNT=0
export FAIL_COUNT=0

echo "" > "$RESULTS_FILE"

# Get CSRF token
CSRF_RESP=$($CURL_CMD -c /tmp/cookies.txt "$BASE/api/auth/csrf" 2>/dev/null)
export CSRF_TOKEN=$(echo "$CSRF_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('csrf_token',''))" 2>/dev/null)
if [ -z "$CSRF_TOKEN" ]; then
  export CSRF_TOKEN=$(grep csrf_token /tmp/cookies.txt 2>/dev/null | awk '{print $NF}')
fi
echo "CSRF: ${CSRF_TOKEN:0:20}..."

# Helper: submit a task and poll result
test_tool() {
    local NAME="$1"
    local ENDPOINT="$2"
    shift 2
    
    echo -n "Testing $NAME... "
    RESP=$($CURL_CMD -b /tmp/cookies.txt -c /tmp/cookies.txt -H "X-CSRF-Token: $CSRF_TOKEN" "$@" "$BASE$ENDPOINT" 2>/dev/null)
    TASK_ID=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('task_id','NOTASK'))" 2>/dev/null)
    
    if [ "$TASK_ID" = "NOTASK" ] || [ -z "$TASK_ID" ]; then
        echo "FAIL (no task_id) resp=${RESP:0:100}"
        echo "  [FAIL] $NAME: no task_id - ${RESP:0:80}" >> "$RESULTS_FILE"
        FAIL_COUNT=$((FAIL_COUNT+1))
        return
    fi
    
    # Poll for result
    for i in $(seq 1 30); do
        sleep 1
        STATUS_RESP=$($CURL_CMD -b /tmp/cookies.txt "$BASE/api/tasks/$TASK_ID/status" 2>/dev/null)
        TASK_STATE=$(echo "$STATUS_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('state','unknown'))" 2>/dev/null)
        if [ "$TASK_STATE" = "completed" ] || [ "$TASK_STATE" = "SUCCESS" ]; then
            echo "PASS"
            echo "  [PASS] $NAME" >> "$RESULTS_FILE"
            PASS_COUNT=$((PASS_COUNT+1))
            return
        elif [ "$TASK_STATE" = "failed" ] || [ "$TASK_STATE" = "FAILURE" ]; then
            ERR_MSG=$(echo "$STATUS_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('result',{}); print(r.get('error','') if isinstance(r,dict) else str(r)[:80])" 2>/dev/null)
            echo "FAIL ($ERR_MSG)"
            echo "  [FAIL] $NAME: $ERR_MSG" >> "$RESULTS_FILE"
            FAIL_COUNT=$((FAIL_COUNT+1))
            return
        fi
    done
    echo "TIMEOUT"
    echo "  [FAIL] $NAME: TIMEOUT" >> "$RESULTS_FILE"
    FAIL_COUNT=$((FAIL_COUNT+1))
}

# Create test files
python3 -c "
from reportlab.pdfgen import canvas
c = canvas.Canvas('/tmp/test.pdf')
c.drawString(100,750,'Test Document')
c.showPage()
c.save()
print('PDF created')
"

python3 -c "
from PIL import Image
img = Image.new('RGB', (200, 200), color='blue')
img.save('/tmp/test.png')
print('PNG created')
"

python3 -c "
from docx import Document
doc = Document()
doc.add_paragraph('Hello World')
doc.save('/tmp/test.docx')
print('DOCX created')
" 2>/dev/null || echo "DOCX creation skipped"

python3 -c "
import openpyxl
wb = openpyxl.Workbook()
ws = wb.active
ws.append(['Name','Age'])
ws.append(['Alice',30])
wb.save('/tmp/test.xlsx')
print('XLSX created')
" 2>/dev/null || echo "XLSX creation skipped"

python3 -c "
from pptx import Presentation
prs = Presentation()
slide = prs.slides.add_slide(prs.slide_layouts[0])
slide.shapes.title.text = 'Test'
prs.save('/tmp/test.pptx')
print('PPTX created')
" 2>/dev/null || echo "PPTX creation skipped"

echo ""
echo "=== RUNNING TOOL TESTS ==="
echo ""

test_tool "compress-pdf" "/api/compress/pdf" -F "file=@/tmp/test.pdf"

if [ -f /tmp/test.docx ]; then
    test_tool "word-to-pdf" "/api/convert/word-to-pdf" -F "file=@/tmp/test.docx"
fi

if [ -f /tmp/test.xlsx ]; then
    test_tool "excel-to-pdf" "/api/convert/excel-to-pdf" -F "file=@/tmp/test.xlsx"
fi

if [ -f /tmp/test.pptx ]; then
    test_tool "pptx-to-pdf" "/api/convert/pptx-to-pdf" -F "file=@/tmp/test.pptx"
fi

test_tool "pdf-to-word" "/api/convert/pdf-to-word" -F "file=@/tmp/test.pdf"

test_tool "pdf-to-excel" "/api/convert/pdf-to-excel" -F "file=@/tmp/test.pdf"

test_tool "image-compress" "/api/image/compress" -F "file=@/tmp/test.png"

test_tool "image-convert" "/api/image/convert" -F "file=@/tmp/test.png" -F "target_format=jpeg"

test_tool "image-resize" "/api/image/resize" -F "file=@/tmp/test.png" -F "width=100" -F "height=100"

test_tool "image-rotate" "/api/image/rotate-flip" -F "file=@/tmp/test.png" -F "operation=rotate_90"

test_tool "pdf-merge" "/api/pdf-tools/merge" -F "files=@/tmp/test.pdf" -F "files=@/tmp/test.pdf"

test_tool "pdf-split" "/api/pdf-tools/split" -F "file=@/tmp/test.pdf" -F "split_method=every_page"

test_tool "pdf-watermark" "/api/pdf-tools/watermark" -F "file=@/tmp/test.pdf" -F "watermark_text=TEST"

test_tool "pdf-protect" "/api/pdf-tools/protect" -F "file=@/tmp/test.pdf" -F "password=test123"

test_tool "pdf-page-numbers" "/api/pdf-tools/page-numbers" -F "file=@/tmp/test.pdf" -F "position=bottom-center"

test_tool "pdf-rotate" "/api/pdf-tools/rotate" -F "file=@/tmp/test.pdf" -F "angle=90"

test_tool "pdf-metadata" "/api/pdf-tools/metadata" -F "file=@/tmp/test.pdf" -F "title=Test" -F "author=Bot"

test_tool "pdf-repair" "/api/pdf-tools/repair" -F "file=@/tmp/test.pdf"

test_tool "pdf-flatten" "/api/pdf-tools/flatten" -F "file=@/tmp/test.pdf"

test_tool "pdf-extract-pages" "/api/pdf-tools/extract-pages" -F "file=@/tmp/test.pdf" -F "pages=1"

test_tool "pdf-to-images" "/api/pdf-tools/pdf-to-images" -F "file=@/tmp/test.pdf"

test_tool "images-to-pdf" "/api/pdf-tools/images-to-pdf" -F "files=@/tmp/test.png"

test_tool "ocr-image" "/api/ocr/image" -F "file=@/tmp/test.png" -F "language=eng"

test_tool "ocr-pdf" "/api/ocr/pdf" -F "file=@/tmp/test.pdf" -F "language=eng"

echo -n "Testing qrcode-generate... "
QR_RESP=$($CURL_CMD -b /tmp/cookies.txt -c /tmp/cookies.txt -H "X-CSRF-Token: $CSRF_TOKEN" -H "Content-Type: application/json" -d '{"text":"https://dociva.io"}' "$BASE/api/qrcode/generate" 2>/dev/null)
QR_LEN=${#QR_RESP}
if [ "$QR_LEN" -gt 100 ]; then
    echo "PASS (got ${QR_LEN} bytes)"
    echo "  [PASS] qrcode-generate" >> "$RESULTS_FILE"
    PASS_COUNT=$((PASS_COUNT+1))
else
    echo "FAIL (${QR_RESP:0:80})"
    echo "  [FAIL] qrcode-generate: ${QR_RESP:0:80}" >> "$RESULTS_FILE"
    FAIL_COUNT=$((FAIL_COUNT+1))
fi

echo -n "Testing barcode-generate... "
BC_RESP=$($CURL_CMD -b /tmp/cookies.txt -c /tmp/cookies.txt -H "X-CSRF-Token: $CSRF_TOKEN" -H "Content-Type: application/json" -d '{"data":"123456789","format":"code128"}' "$BASE/api/barcode/generate" 2>/dev/null)
BC_LEN=${#BC_RESP}
if [ "$BC_LEN" -gt 100 ]; then
    echo "PASS (got ${BC_LEN} bytes)"
    echo "  [PASS] barcode-generate" >> "$RESULTS_FILE"
    PASS_COUNT=$((PASS_COUNT+1))
else
    echo "FAIL (${BC_RESP:0:80})"
    echo "  [FAIL] barcode-generate: ${BC_RESP:0:80}" >> "$RESULTS_FILE"
    FAIL_COUNT=$((FAIL_COUNT+1))
fi

echo ""
echo "=== DOCIVA TOOL TEST RESULTS ==="
cat "$RESULTS_FILE"
echo ""
echo "  PASSED: $PASS_COUNT"
echo "  FAILED: $FAIL_COUNT"
echo "  TOTAL:  $((PASS_COUNT+FAIL_COUNT))"
