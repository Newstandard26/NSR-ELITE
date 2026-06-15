// Fixed, centered brand watermark. Page content scrolls over the top of it.
export function BrandWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-full.svg" alt="" className="w-[94%] max-w-6xl opacity-[0.30]" />
    </div>
  );
}
