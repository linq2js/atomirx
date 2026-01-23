# Web Interface Guidelines

Review UI code for Web Interface Guidelines compliance.

## Trigger

Use when asked to:
- Review UI/UX code
- Check accessibility
- Audit design patterns
- Check site against best practices

## How It Works

1. **Fetch** latest guidelines from source URL
2. **Read** specified files (or ask user)
3. **Check** against all rules
4. **Output** findings in `file:line` format

## Guidelines Source

Fetch fresh before each review:

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Use WebFetch to get latest rules. Output format defined in fetched content.

## Usage

With file argument:
1. Fetch guidelines from URL
2. Read specified files
3. Apply rules from guidelines
4. Output findings per format

Without files: ask user which files to review.
