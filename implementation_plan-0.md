# Rebuild PDF Cropper to be Visual and Interactive

The user correctly identified that the current "Crop PDF" tool provides a poor user experience by asking for manual margin coordinates (numbers) instead of providing a visual interface. To match industry standards (like iLovePDF), the tool should visually render the PDF and allow the user to draw a crop box over it.

## Background Context
Currently, the frontend component `CropPdf.tsx` just presents 4 numeric input fields for `top`, `bottom`, `left`, and `right` margins. 
To make it visual, we need a way to render the PDF page in the browser, and overlay a draggable/resizable crop box.

## Proposed Changes

We will introduce two new libraries to the frontend to handle this elegantly:
1. **`react-pdf`**: A standard React wrapper around Mozilla's `pdf.js` to securely render PDF pages in the browser.
2. **`react-image-crop`**: A lightweight, robust UI library to draw a resizable crop box over an element (the rendered PDF page).

### [Frontend Components]

#### [MODIFY] [CropPdf.tsx](file:///c:/xampp/htdocs/SaaS-PDF/frontend/src/components/tools/CropPdf.tsx)
- Redesign the "upload" phase into two sub-phases: "Select File" and "Visual Crop".
- After a file is selected, render the first page of the PDF using `react-pdf`'s `<Document>` and `<Page>` components.
- Wrap the rendered `<Page>` inside `<ReactCrop>` (from `react-image-crop`).
- As the user draws and resizes the crop box, capture the `x`, `y`, `width`, and `height` percentages.
- When the user clicks "Crop", calculate the actual point-based margins (`margin_top`, `margin_bottom`, `margin_left`, `margin_right`) based on the original dimensions of the PDF page.
- Send these calculated margins to the backend using the existing API endpoint `/pdf-tools/crop`.

#### [MODIFY] [package.json](file:///c:/xampp/htdocs/SaaS-PDF/frontend/package.json)
- Add `react-pdf` and `react-image-crop` dependencies.

## Open Questions
- Do you want to apply the crop to all pages by default, or just the current page (similar to the screenshot provided)? The current backend API already supports an `all` or specific pages parameter. I will default it to `all` but provide an option if needed, or stick to the simplest UX.

## Verification Plan

### Automated Tests
- N/A

### Manual Verification
1. Run the frontend application.
2. Navigate to the Crop PDF tool.
3. Upload a PDF.
4. Verify the PDF is rendered visually on the screen.
5. Draw a crop box over a specific section.
6. Click "Crop PDF".
7. Download the result and verify the PDF is cropped exactly to the visual selection.
