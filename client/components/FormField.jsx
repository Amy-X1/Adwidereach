export default function FormField({ label, error, children, required }) {
  return (
    <div>
      {label && (
        <label className="input-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && <p className="input-error">{error}</p>}
    </div>
  );
}
