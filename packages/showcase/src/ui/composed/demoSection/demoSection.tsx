import { ReactNode } from "react";

/**
 * Demo section component for wrapping demo content.
 *
 * @description Provides consistent layout for demo sections with
 * a title, optional description, and card-styled content area.
 */

export interface DemoSectionProps {
  /** The section title */
  title: string;
  /** Optional description text */
  description?: string;
  /** The demo content to render */
  children: ReactNode;
}

/**
 * Wraps demo content in a styled section with title and description.
 *
 * @param props - Component props
 * @param props.title - The section heading
 * @param props.description - Optional explanatory text
 * @param props.children - The demo content to display
 * @returns A styled section element with title, description, and content card
 *
 * @example
 * <DemoSection
 *   title="Basic Counter"
 *   description="A simple counter using atoms"
 * >
 *   <CounterDemo />
 * </DemoSection>
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
