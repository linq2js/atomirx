import { useEffect } from "react";
import { atom, derived } from "atomirx";
import { useSelector } from "atomirx/react";
import { DemoSection } from "../components/DemoSection";
import { CodeBlock } from "../components/CodeBlock";
import { useEventLog } from "../App";
import { Calculator, ArrowRight, Shuffle } from "lucide-react";

// Source atoms
const priceAtom = atom(100, { key: "price" });
const quantityAtom = atom(2, { key: "quantity" });
const discountAtom = atom(0.1, { key: "discount" }); // 10%

// Derived atoms
const subtotalAtom = derived(
  [priceAtom, quantityAtom],
  (getPrice, getQuantity) => getPrice() * getQuantity()
);

const discountAmountAtom = derived(
  [subtotalAtom, discountAtom],
  (getSubtotal, getDiscount) => getSubtotal() * getDiscount()
);

const totalAtom = derived(
  [subtotalAtom, discountAmountAtom],
  (getSubtotal, getDiscountAmount) => getSubtotal() - getDiscountAmount()
);

// Conditional dependency example
const showDetailsAtom = atom(false, { key: "showDetails" });
const basicInfoAtom = atom({ label: "Basic" }, { key: "basicInfo" });
const detailedInfoAtom = atom(
  { label: "Detailed", extra: "More info here" },
  { key: "detailedInfo" }
);

const infoAtom = derived(
  [showDetailsAtom, basicInfoAtom, detailedInfoAtom],
  (getShowDetails, getBasicInfo, getDetailedInfo) =>
    getShowDetails() ? getDetailedInfo() : getBasicInfo()
);

export function DerivedAtomDemo() {
  // Shorthand: pass atom directly to get its value
  const price = useSelector(priceAtom);
  const quantity = useSelector(quantityAtom);
  const discount = useSelector(discountAtom);
  const subtotal = useSelector(subtotalAtom);
  const discountAmount = useSelector(discountAmountAtom);
  const total = useSelector(totalAtom);
  const showDetails = useSelector(showDetailsAtom);
  const info = useSelector(infoAtom);

  const { log } = useEventLog();

  useEffect(() => {
    const unsubs = [
      priceAtom.on(() => log(`Price: $${priceAtom.value}`)),
      quantityAtom.on(() => log(`Quantity: ${quantityAtom.value}`)),
      subtotalAtom.on(() => log(`Subtotal recalculated: $${subtotalAtom.value}`, "success")),
      totalAtom.on(() => log(`Total recalculated: $${totalAtom.value?.toFixed(2)}`, "success")),
    ];
    return () => unsubs.forEach((u) => u());
  }, [log]);

  const randomize = () => {
    log("Randomizing values...");
    priceAtom.set(Math.floor(Math.random() * 200) + 50);
    quantityAtom.set(Math.floor(Math.random() * 10) + 1);
    discountAtom.set(Math.random() * 0.3);
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

const price = atom(100);
const quantity = atom(2);

// Single source
const doubled = derived(price, (get) => get() * 2);

// Multiple sources
const total = derived(
  [price, quantity],
  (getPrice, getQuantity) => getPrice() * getQuantity()
);

// Conditional dependencies - only subscribes to accessed atoms
const info = derived(
  [showDetails, basicInfo, detailedInfo],
  (getShow, getBasic, getDetailed) =>
    getShow() ? getDetailed() : getBasic()
);
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
                onChange={(e) => priceAtom.set(Number(e.target.value))}
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
                onChange={(e) => quantityAtom.set(Number(e.target.value))}
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
                onChange={(e) => discountAtom.set(Number(e.target.value) / 100)}
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
              <p className="text-lg font-semibold text-primary-400">{quantity}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-surface-500" />
            <div className="text-center">
              <p className="text-xs text-surface-500">Subtotal</p>
              <p className="text-lg font-semibold text-surface-100">${subtotal}</p>
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

          <button onClick={randomize} className="btn-accent flex items-center gap-2">
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
                onChange={(e) => showDetailsAtom.set(e.target.checked)}
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
            When unchecked, changes to <code className="text-primary-400">detailedInfoAtom</code> won't
            trigger recomputation.
          </p>
        </div>
      </DemoSection>

    </div>
  );
}
