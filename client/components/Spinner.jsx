export default function Spinner({ full, size = 24 }) {
  const spinner = (
    <div
      className="animate-spin rounded-full border-2 border-gray-300 border-t-brand-600"
      style={{ width: size, height: size }}
    />
  );
  if (!full) return spinner;
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      {spinner}
    </div>
  );
}
