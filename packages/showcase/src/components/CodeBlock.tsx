interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code }: CodeBlockProps) {
  return (
    <pre className="code-block">
      <code className="text-surface-300">{code.trim()}</code>
    </pre>
  );
}
