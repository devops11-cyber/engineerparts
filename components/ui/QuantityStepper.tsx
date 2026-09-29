"use client";

export function QuantityStepper({
  value,
  max,
  onChange,
  disabled = false,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-md border border-navy-200">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={disabled || value <= 1}
        className="px-3 text-lg font-semibold text-navy-800 transition-colors hover:bg-navy-50 disabled:opacity-40"
        aria-label="Decrease quantity"
      >
        &minus;
      </button>
      <input
        type="number"
        min={1}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
        disabled={disabled}
        className="w-14 border-x border-navy-200 py-2 text-center text-sm font-semibold text-navy-900 focus:outline-none"
        aria-label="Quantity"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className="px-3 text-lg font-semibold text-navy-800 transition-colors hover:bg-navy-50 disabled:opacity-40"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
