---
name: legal-doc-generate
description: "Modify, create, and render legal templates to styled PDFs or text files using Jinja2 and ReportLab."
argument-hint: "[template_id]"
license: MIT
metadata:
  author: Antigravity
  version: "1.0.0"
---

# Legal Document Generator Skill

Use this skill to configure document templates, add form fields, and modify PDF stylesheets for the document generator.

## When to Activate

- When new legal document templates (e.g., deed of gift, partnership agreements, notice of eviction) are required.
- When form field fields inside a template dictionary need to be added or changed.
- When Jinja2 template strings in `TEMPLATE_TEXTS` require updates.
- When custom styling in the PDF generation function `_build_pdf` is updated (e.g., modifying fonts, line heights, colors, headers/footers).

## Workflow

### Step 1: Manage Templates and Fields

All document schemas are defined in [doc_service.py](file:///e:/Projects/pakistan-legalai/pakistan-legalai/backend/services/doc_service.py).
1. Add a template dictionary to `TEMPLATES` with:
   - `id`: unique string id
   - `name`: descriptive name
   - `category`: rental, affidavit, business, civil, employment, family
   - `icon`: representative emoji
   - `fields`: list of dicts with `id`, `label`, `type` ("text", "textarea", "number", "date"), and `required` boolean.
2. Define the Jinja2 template structure in the `TEMPLATE_TEXTS` mapping.

### Step 2: Custom Jinja Filters & Formatting

To format numbers as Pakistani Rupee representation (e.g., `1,00,000` instead of `100000`), use the `format_pk` filter:
```jinja2
PKR {{ rent_amount | int | format_pk }}
```
*Note: This is registered as a custom filter in the Jinja2 environment in `DocService`.*

### Step 3: PDF Generation Styles (ReportLab)

The helper `_build_pdf` handles PDF generation. Styles include:
- **Fonts**: Helvetica-Bold (for headers/titles) and Helvetica (for body text).
- **Colors**: HexColor `#0a1628` (Navy), HexColor `#c8962e` (Gold), and HexColor `#f5f5f5` (Light Gray).
- **Page settings**: A4 size, 2.5cm margins.

To test rendering:
1. Trigger document creation from the API using `/api/documents/generate` router or via the Streamlit / React frontend.
2. Temporary PDF files are written to `<temp_dir>/legalai_docs/`.
3. If ReportLab fails, the code automatically falls back to generating plain text `.txt` files.
4. Verify the visual formatting of the PDF layout, ensuring headers, signature blocks, and margins align properly.
