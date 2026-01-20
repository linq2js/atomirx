import { ReactNode } from "react";

/**
 * Props for the DemoSection component.
 */
export interface DemoSectionProps {
  /** Title of the demo section */
  title: string;
  /** Optional description text shown below the title */
  description?: string;
  /** Content to render inside the demo card */
  children: ReactNode;
}

/**
 * A section wrapper for demo content with title and optional description.
 * Used to organize and present individual demo examples.
 *
 * @example
 * ```tsx
 * <DemoSection
 *   title="Basic Counter"
 *   description="Demonstrates a simple counter with atom state"
 * >
 *   <Counter />
 * </DemoSection>
 * ```
 */
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
