// Shown straight away while a page's data loads, so navigation feels instant.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded bg-muted/20" />
      <div className="h-4 w-72 rounded bg-muted/15" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="card h-28" />
      ))}
    </div>
  );
}
