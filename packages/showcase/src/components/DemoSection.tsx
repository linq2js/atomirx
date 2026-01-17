import { ReactNode } from "react";

interface DemoSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function DemoSection({
  title,
  description,
  children,
}: DemoSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-surface-100">{title}</h3>
        {description && (
          <p className="text-sm text-surface-400 mt-1">{description}</p>
        )}
      </div>
      <div className="card">{children}</div>
    </section>
  );
}
