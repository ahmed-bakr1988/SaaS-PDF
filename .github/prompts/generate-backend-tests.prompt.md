---
description: "Generate a complete pytest test file for the selected Flask route or service code, following project conventions in backend/tests/"
name: "Generate Backend Tests"
argument-hint: "Optional: additional context or specific scenarios to cover"
agent: "agent"
tools: ["read_file", "grep_search", "file_search"]
---

Generate a complete pytest test file for the following Flask backend code (shown in `#selection`):

```
#selection
```

## Rules

Follow the conventions used in [backend/tests/](../../backend/tests/):

- **Class-based**: Wrap all test methods in a `class Test<RouteName>` (e.g., `class TestCompressRoutes`).
- **Fixtures**: Use `client` for HTTP tests and `app` only when patching `app.config`. Both come from [backend/tests/conftest.py](../../backend/tests/conftest.py). Do **not** redefine fixtures.
- **CSRF**: The `CSRFTestClient` in conftest injects `X-CSRF-Token` automatically for mutating requests — no manual handling needed.
- **Mocking**: Use `unittest.mock.patch` and `MagicMock`. Patch at the service boundary (e.g., `@patch("app.routes.compress.compress_service.run")`) not at the stdlib level.
- **Assertions**: Always assert `response.status_code` first, then check `response.get_json()` contents.
- **Naming**: Test method names must be descriptive, e.g., `test_compress_returns_200_on_valid_pdf`, `test_compress_returns_400_when_no_file_provided`.

## Required Coverage

Include tests for:
1. **Happy path** — valid input, expected 2xx response and payload shape.
2. **Missing / invalid input** — 400 responses with an `error` key in JSON.
3. **Unauthenticated access** — 401 when a login-protected route is hit without a session (register + logout first if needed).
4. **Service failure** — mock the underlying service to raise an exception and assert the route returns 500.
5. **Edge cases** — any domain-specific boundaries visible in the selected code (e.g., file size limits, unsupported MIME types, quota exceeded).

## Output Format

Output a single, ready-to-save Python file.  
- First line: `"""Tests for <describe the module>."""`  
- Then imports, then the test class(es).  
- Suggest the save path as a comment at the top: `# Save as: backend/tests/test_<module_name>.py`
- Do **not** add `if __name__ == "__main__"` blocks.

{{argument}}
