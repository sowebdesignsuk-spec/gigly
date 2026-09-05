export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-tight ${className}`}>
      GIG<span className="text-hot-500">LY</span>
    </span>
  );
}
