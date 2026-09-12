import KineticGrid from "@/components/ui/kinetic-grid";

export default function KineticGridDemo() {
  return (
    <KineticGrid>
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <span className="mb-5 rounded-full border border-white/15 px-3 py-1 text-xs font-medium tracking-wide text-white/70">
          Interactive Background
        </span>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
          Move your cursor. Click anywhere.
        </h1>
        <p className="mt-4 max-w-md text-base text-white/50">
          A kinetic grid that warps toward the pointer and ripples on every
          click.
        </p>
      </div>
    </KineticGrid>
  );
}
