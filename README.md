# n8n-nodes-compdf

This is an n8n community node that integrates [ComPDF API](https://api.compdf.com/) into your n8n workflows, enabling async document processing including PDF conversion, intelligent document extraction, PDF merging, splitting, compression, and more.

[ComPDF](https://www.compdf.com/) provides powerful document processing APIs that support PDF conversion, OCR, document comparison, intelligent extraction, and many other document operations.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation) | [Operations](#operations) | [Credentials](#credentials) | [Compatibility](#compatibility) | [Usage](#usage) | [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

Select a **Resource**, then choose an **Operation** within that resource. The 17 operations are grouped as follows:

Existing workflows retain their saved operation values and API routes. When editing an existing node, select the matching resource to see its operation in the dropdown.

### Document Conversion
| Operation | Description |
|---|---|
| **PDF to Word** | Convert PDF files into Word documents |
| **PDF to JSON** | Convert PDF files into JSON format |
| **PDF to Others** | Convert PDF to Excel, PPT, HTML, RTF, PNG, JPG, TXT, CSV, Markdown |
| **PDF to Editable PDF (OCR)** | Convert scanned/image-based PDFs into editable PDFs using OCR |
| **Others to PDF** | Convert Word, Excel, PPT, HTML, RTF, images, TXT, CSV into PDF |
| **Image to Others** | Convert image files into other formats |

### Intelligent Document Processing
| Operation | Description |
|---|---|
| **Intelligent Document Extraction** | AI-powered extraction to capture key information and map intelligent fields |
| **Intelligent Document Parsing** | AI-powered parsing to transform unstructured documents into structured data |

### PDF
| Operation | Description |
|---|---|
| **PDF Generation** | Generate PDFs in batch from HTML templates |
| **PDF Merger** | Merge multiple PDF files into a single PDF |
| **PDF Split** | Split a PDF into separate files by pages or page ranges |
| **PDF Extract** | Extract images from documents |
| **PDF Page Tools** | Organize PDF pages (rotate, insert, delete) |
| **Security** | Add or remove watermarks from PDFs in bulk |
| **Compress** | Compress PDF files without losing visual quality |
| **Compare Documents** | Compare documents by analyzing text and images |

### Task
| Operation | Description |
|---|---|
| **Get Task Information** | Query task status and results after processing |

## Credentials

To use this node, you need a **ComPDF API Key**.

1. Sign up at [ComPDF API](https://api.compdf.com/signup)
2. After registration, navigate to the API dashboard to obtain your **Public API Key**
3. In n8n, go to **Credentials** > **New Credential** > search for **ComPDF API**
4. Paste your API Key and save

## Compatibility

- Tested with n8n v2.10.3+
- Requires Node.js 18+

## Usage

All file processing operations in this node use the **async processing** pattern:

1. **Submit a task** — Use any file processing operation (e.g., PDF to Word) to upload a file. The API returns a `taskId`.
2. **Poll for results** — Use the **Get Task Information** operation with the `taskId` to check the processing status.

### Example Workflow

1. Add a **ComPDF** node with resource **Document Conversion** and operation **PDF to Word**
2. Connect it to a source that provides a binary file (e.g., HTTP Request or Read Binary File)
3. The node returns a `taskId` in the output
4. Add another **ComPDF** node with resource **Task** and operation **Get Task Information**
5. Pass the `taskId` from step 3 — the node queries the current task status and returns the result
6. Use an **If** node to check if `taskStatus` is `TaskFinish`, and a **Wait** node to retry if still processing

### Parameters

- **Execute Type URL** — Required for operations like PDF to Others, Others to PDF, etc. Specifies the exact conversion endpoint path.
- **Binary Property** — Name of the input binary property containing the file (default: `data`).
- **Parameter** — Processing parameter for the API request (format specific, see [ComPDF API docs](https://api.compdf.com/)).
- **Language** — Language setting for OCR and text recognition (default: `2`).

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [ComPDF Official Website](https://www.compdf.com/)
* [ComPDF API Documentation](https://api.compdf.com/)
* [ComPDF API Sign Up](https://api.compdf.com/signup)

## License

[MIT](LICENSE)
