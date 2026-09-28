import { getListingStats, getSearchStats } from "./actions";
import ListingStatsTable from "./ListingStatsTable";

function Pct({ value }: { value: number }) {
  return <>{(value * 100).toFixed(1)}%</>;
}

export default async function StatsPage() {
  const [searchStats, listingStats] = await Promise.all([getSearchStats(), getListingStats()]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Stats</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Anonymous search and engagement activity across the directory.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Search activity</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { label: "Last 7 days", stats: searchStats.last7Days },
            { label: "Last 30 days", stats: searchStats.last30Days },
          ].map(({ label, stats }) => (
            <div key={label} className="rounded-xl border border-foreground/10 p-4">
              <p className="text-sm font-medium text-foreground/60">{label}</p>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-foreground/60">Total searches</dt>
                  <dd className="font-medium text-foreground">{stats.totalSearches}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-foreground/60">Zero-result searches</dt>
                  <dd className="font-medium text-foreground">{stats.zeroResultCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-foreground/60">Zero-result rate</dt>
                  <dd className="font-medium text-foreground">
                    <Pct value={stats.zeroResultRate} />
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Top weak &amp; zero-result queries (30 days)</h2>
        {searchStats.topWeakQueries.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/60">
            No weak or zero-result queries recorded in the last 30 days.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-foreground/10">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-foreground/[0.03] text-xs uppercase tracking-wide text-foreground/50">
                <tr>
                  <th className="px-4 py-2 font-medium">Query</th>
                  <th className="px-4 py-2 font-medium">Times searched</th>
                  <th className="px-4 py-2 font-medium">Zero-result count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {searchStats.topWeakQueries.map((q) => (
                  <tr key={q.query}>
                    <td className="px-4 py-2 font-medium text-foreground">{q.query}</td>
                    <td className="px-4 py-2 tabular-nums text-foreground/70">{q.count}</td>
                    <td className="px-4 py-2 tabular-nums text-foreground/70">{q.zeroResultCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Per-listing engagement</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Views, calls, WhatsApp and directions clicks, all-time. Click a column to sort.
        </p>
        <ListingStatsTable rows={listingStats.rows} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Totals by category and sector</h2>
        <div className="mt-3 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-foreground/60">By category</h3>
            <div className="mt-2 overflow-x-auto rounded-xl border border-foreground/10">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-foreground/10">
                  {listingStats.totals.byCategory.length === 0 ? (
                    <tr>
                      <td className="px-4 py-2 text-foreground/60">No activity recorded yet.</td>
                    </tr>
                  ) : (
                    listingStats.totals.byCategory.map((c) => (
                      <tr key={c.category}>
                        <td className="px-4 py-2 text-foreground">{c.category}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-foreground/70">{c.total}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground/60">By sector</h3>
            <div className="mt-2 overflow-x-auto rounded-xl border border-foreground/10">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-foreground/10">
                  {listingStats.totals.bySector.length === 0 ? (
                    <tr>
                      <td className="px-4 py-2 text-foreground/60">No activity recorded yet.</td>
                    </tr>
                  ) : (
                    listingStats.totals.bySector.map((s) => (
                      <tr key={s.sector}>
                        <td className="px-4 py-2 text-foreground">Sector {s.sector}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-foreground/70">{s.total}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
