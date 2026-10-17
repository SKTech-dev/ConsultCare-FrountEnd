export default function ListPages({ page, setPage, hasMore, busy = false, label = "Results" }) {
  if (page === 1 && !hasMore) return null;
  return <nav className="ws-actions ws-space" aria-label={label + " pages"}>
    <button className="ws-link secondary" disabled={busy || page <= 1} onClick={() => setPage(page - 1)} aria-label={label + " previous page"}>Previous</button>
    <span>Page {page}</span>
    <button className="ws-link secondary" disabled={busy || !hasMore} onClick={() => setPage(page + 1)} aria-label={label + " next page"}>Next</button>
  </nav>;
}
