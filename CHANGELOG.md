# Changelog

## [1.0.7] - 2026-10-16

### Changed
- Group the 17 operations under Document Conversion, Intelligent Document Processing, PDF, and Task resources, preserving existing operation values and API routes.

### Fixed
- Use a scanner-compatible conditional throw that preserves existing n8n errors and wraps other failures in NodeApiError, without suppressing the error-wrapping lint rule.

## [1.0.0] - 2026-03-05

### Changed
- Split single `fileProcessing` operation into 16 distinct operations by document processing category.
- Fixed `executeTypeUrl` for 11 operations (PDF to Word, PDF to Json, PDF to Editable PDF, Intelligent Document Extraction, Intelligent Document Parsing, PDF Generation, PDF Merger, PDF Split, PDF Extract, Compress, Compare Documents).
- 5 operations still require user-provided `executeTypeUrl` (PDF to Others, Others to PDF, Image to Others, PDF Page Tools, Security).
- `Get Task Information` operation remains unchanged.
- Updated version from 0.2.0 to 1.0.0.
