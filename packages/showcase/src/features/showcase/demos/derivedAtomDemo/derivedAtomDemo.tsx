/**
 * @module DerivedAtomDemo
 * @description Demonstrates derived atoms with automatic dependency tracking.
 */

import { useEffect } from "react";
import { atom, derived } from "atomirx";
import { useSelector } from "atomirx/react";
import { DemoSection, CodeBlock } from "../../../../ui";
import { eventLogStore } from "../../stores";
import { Calculator, ArrowRight, Shuffle } from "lucide-react";

// Source atoms (use $ suffix convention)
const price$ = atom(100, { meta: { key: "price" } });
const quantity$ = atom(2, { meta: { key: "quantity" } });
const discount$ = atom(0.1, { meta: { key: "discount" } }); // 10%

// Derived atoms (use context-based API)
const subtotal$ = derived(({ read }) => read(price$) * read(quantity$));

const discountAmount$ = derived(
  ({ read }) => read(subtotal$) * read(discount$)
);

const total$ = derived(({ read }) => read(subtotal$) - read(discountAmount$));

// Conditional dependency example
const showDetails$ = atom(false, { meta: { key: "showDetails" } });
const basicInfo$ = atom({ label: "Basic" }, { meta: { key: "basicInfo" } });
const detailedInfo$ = atom(
  { label: "Detailed", extra: "More info here" },
  { meta: { key: "detailedInfo" } }
);

// Conditional dependencies - only subscribes to accessed atoms
const info$ = derived(({ read }) =>
  read(showDetails$) ? read(detailedInfo$) : read(basicInfo$)
);

/**
 * Demo component showing derived atom operations.
 *
 * @example
 * ```tsx
 * <DerivedAtomDemo />
 * ```
 */
export function DerivedAtomDemo() {
  // Shorthand: pass atom directly to get its value
  const price = useSelector(price$);
  const quantity = useSelector(quantity$);
  const discount = useSelector(discount$);
  const subtotal = useSelector(subtotal$);
  const discountAmount = useSelector(discountAmount$);
  const total = useSelector(total$);
  const showDetails = useSelector(showDetails$);
  const info = useSelector(info$);

  const { log } = eventLogStore();

  useEffect(() => {
    const unsubs = [
      price$.on(() => log(`Price: $${price$.get()}`)),
      quantity$.on(() => log(`Quantity: ${quantity$.get()}`)),
      subtotal$.on(() =>
        log(`Subtotal recalculated: $${subtotal$.staleValue}`, "success")
      ),
      total$.on(() =>
        log(`Total recalculated: $${total$.staleValue?.toFixed(2)}`, "success")
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [log]);

  const randomize = () => {
    log("Randomizing values...");
    price$.set(Math.floor(Math.random() * 200) + 50);
    quantity$.set(Math.floor(Math.random() * 10) + 1);
    discount$.set(Math.random() * 0.3);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gradient mb-2">Derived Atoms</h2>
        <p className="text-surface-400">
          Derived atoms compute values from other atoms and automatically update
          when dependencies change. They support conditional dependencies.
        </p>
      </div>

      {/* Code Example */}
      <CodeBlock
        code={`
import { atom, derived } from "atomirx";

const price$ = atom(100);
const quantity$ = atom(2);

// Context-based derived - automatic dependency tracking
const doubled$ = derived(({ read }) => read(price$) * 2);

// Multiple sources
const total$ = derived(({ read }) => read(price$) * read(quantity$));

// Conditional dependencies - only subscribes to accessed atoms
const info$ = derived(({ read }) =>
  read(showDetails$) ? read(detailedInfo$) : read(basicInfo$)
);

// Async dependencies - read() auto-unwraps Promises
const userData$ = atom(fetchUser());
const userName$ = derived(({ read }) => read(userData$).name);
        `}
      />

      {/* Calculator Demo */}
      <DemoSection
        title="Shopping Cart Calculator"
        description="Derived atoms automatically recompute when source atoms change"
      >
        <div className="space-y-6">
          {/* Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-surface-400 mb-2">
                Price ($)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => price$.set(Number(e.target.value))}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm text-surface-400 mb-2">
                Quantity
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => quantity$.set(Number(e.target.value))}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm text-surface-400 mb-2">
                Discount (%)
              </label>
              <input
                type="number"
                value={Math.round(discount * 100)}
                onChange={(e) => discount$.set(Number(e.target.value) / 100)}
                className="input"
              />
            </div>
          </div>

          {/* Calculation Flow */}
          <div className="flex flex-wrap items-center justify-center gap-3 p-4 bg-surface-800/50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-surface-500">Price</p>
              <p className="text-lg font-semibold text-primary-400">${price}</p>
            </div>
            <span className="text-surface-500">×</span>
            <div className="text-center">
              <p className="text-xs text-surface-500">Qty</p>
              <p className="text-lg font-semibold text-primary-400">
                {quantity}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-surface-500" />
            <div className="text-center">
              <p className="text-xs text-surface-500">Subtotal</p>
              <p className="text-lg font-semibold text-surface-100">
                ${subtotal}
              </p>
            </div>
            <span className="text-surface-500">-</span>
            <div className="text-center">
              <p className="text-xs text-surface-500">Discount</p>
              <p className="text-lg font-semibold text-amber-400">
                ${discountAmount.toFixed(2)}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-surface-500" />
            <div className="text-center px-4 py-2 bg-gradient-to-r from-primary-500/20 to-accent-500/20 rounded-lg border border-primary-500/30">
              <p className="text-xs text-surface-500">Total</p>
              <p className="text-2xl font-bold text-gradient">
                ${total.toFixed(2)}
              </p>
            </div>
          </div>

          <button
            onClick={randomize}
            className="btn-accent flex items-center gap-2"
          >
            <Shuffle className="w-4 h-4" />
            Randomize Values
          </button>
        </div>
      </DemoSection>

      {/* Conditional Dependencies */}
      <DemoSection
        title="Conditional Dependencies"
        description="Derived atoms only subscribe to atoms that are actually accessed"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDetails}
                onChange={(e) => showDetails$.set(e.target.checked)}
                className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-surface-300">Show detailed info</span>
            </label>
          </div>

          <div className="p-4 bg-surface-800/50 rounded-lg">
            <p className="text-sm text-surface-400 mb-1">Current info:</p>
            <p className="text-lg font-semibold text-surface-100">
              {info.label}
              {"extra" in info && (
                <span className="ml-2 text-sm text-surface-400">
                  - {(info as { label: string; extra: string }).extra}
                </span>
              )}
            </p>
          </div>

          <p className="text-sm text-surface-500">
            <Calculator className="w-4 h-4 inline mr-1" />
            When unchecked, changes to{" "}
            <code className="text-primary-400">detailedInfo$</code> won't
            trigger recomputation.
          </p>
        </div>
      </DemoSection>
    </div>
  );
}
