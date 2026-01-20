/**
 * Code block component for displaying formatted code snippets.
 *
 * @description Renders code in a styled pre/code block with
 * consistent styling across the application.
 */

export interface CodeBlockProps {
  /** The code content to display */
  code: string;
  /** Optional language identifier (for future syntax highlighting) */
  language?: string;
}

/**
 * Displays code in a formatted block with consistent styling.
 *
 * @param props - Component props
 * @param props.code - The code string to display (auto-trimmed)
 * @param props.language - Optional language identifier
 * @returns A styled pre/code block element
 *
 * @example
 * <CodeBlock code="const x = 1;" language="typescript" />
 */
export function CodeBlock({ code }: CodeBlockProps) {
  return (
    <pre className="code-block">
      <code className="text-surface-300">{code.trim()}</code>
    </pre>
  );
}
