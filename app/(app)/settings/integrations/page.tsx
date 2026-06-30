// Integration settings. Secrets live in env vars (never the DB); we show masked
// presence so admins can confirm configuration without exposing values.
export const dynamic = "force-dynamic";

function mask(val?: string) {
  if (!val) return { set: false, masked: "— not set —" };
  const tail = val.slice(-4);
  return { set: true, masked: `••••••••${tail}` };
}

export default function IntegrationsSettingsPage() {
  const acculynx = mask(process.env.ACCULYNX_API_KEY);
  const mapbox = mask(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
  const google = mask(process.env.GOOGLE_PLACES_API_KEY);
  const cloudinary = mask(process.env.CLOUDINARY_URL);

  const rows = [
    { label: "AccuLynx API Key", ...acculynx, hint: "ACCULYNX_API_KEY" },
    { label: "Mapbox Token", ...mapbox, hint: "NEXT_PUBLIC_MAPBOX_TOKEN" },
    { label: "Google Places Key", ...google, hint: "GOOGLE_PLACES_API_KEY" },
    { label: "Cloudinary", ...cloudinary, hint: "CLOUDINARY_URL" },
  ];

  // --- Property data (ATTOM) diagnostic: what the running server resolves ---
  const provider = process.env.PROPERTY_DATA_PROVIDER ?? null;
  const attomKey = mask(process.env.ATTOM_API_KEY);
  const serverEnabled = process.env.PROPERTY_ENRICHMENT_ENABLED ?? null;
  const browserEnabled = process.env.NEXT_PUBLIC_PROPERTY_ENRICHMENT_ENABLED ?? null;
  const activeProvider = provider === "attom" && attomKey.set ? "attom" : "mock";

  let reason = "";
  if (activeProvider === "mock") {
    if (!provider) reason = "PROPERTY_DATA_PROVIDER is not set on this deployment (set it, then redeploy).";
    else if (provider !== "attom") reason = `PROPERTY_DATA_PROVIDER is "${provider}" — it must be exactly "attom".`;
    else if (!attomKey.set) reason = "ATTOM_API_KEY is not set on this deployment.";
  }

  const propRows = [
    { label: "Provider", value: provider ?? "— not set —", ok: provider === "attom", hint: "PROPERTY_DATA_PROVIDER (must be: attom)" },
    { label: "ATTOM API Key", value: attomKey.masked, ok: attomKey.set, hint: "ATTOM_API_KEY" },
    { label: "Enrichment enabled (server)", value: serverEnabled ?? "— not set —", ok: serverEnabled === "true", hint: "PROPERTY_ENRICHMENT_ENABLED (must be: true)" },
    { label: "Enrichment enabled (browser)", value: browserEnabled ?? "— not set —", ok: browserEnabled === "true", hint: "NEXT_PUBLIC_PROPERTY_ENRICHMENT_ENABLED (must be: true)" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Integrations</h2>
        <div className="overflow-hidden rounded-2xl border border-zinc-800">
          {rows.map((r) => (
            <div key={r.hint} className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 p-3 last:border-b-0">
              <div>
                <p className="text-sm font-medium">{r.label}</p>
                <p className="font-mono text-xs text-zinc-500">{r.hint}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm">{r.masked}</p>
                <p className={`text-xs ${r.set ? "text-green-400" : "text-zinc-500"}`}>
                  {r.set ? "Configured" : "Missing"}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          These values are read from the deployment environment. Update them in your hosting
          provider (or <code>.env</code>) and redeploy.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Property Data (ATTOM)</h2>
        <div
          className={`rounded-2xl border p-3 ${
            activeProvider === "attom" ? "border-green-500/40 bg-green-500/5" : "border-amber-500/40 bg-amber-500/5"
          }`}
        >
          <p className="text-sm font-semibold">
            Active provider:{" "}
            <span className={activeProvider === "attom" ? "text-green-400" : "text-amber-400"}>
              {activeProvider === "attom" ? "ATTOM (live data)" : "MOCK (sample data)"}
            </span>
          </p>
          {reason && <p className="mt-1 text-xs text-amber-300">{reason}</p>}
          {activeProvider === "mock" && (
            <p className="mt-1 text-xs text-zinc-400">
              Note: env changes only take effect after a redeploy. Fix the value, redeploy, then reload this page.
            </p>
          )}
        </div>
        <div className="overflow-hidden rounded-2xl border border-zinc-800">
          {propRows.map((r) => (
            <div key={r.hint} className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 p-3 last:border-b-0">
              <div>
                <p className="text-sm font-medium">{r.label}</p>
                <p className="font-mono text-xs text-zinc-500">{r.hint}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm">{r.value}</p>
                <p className={`text-xs ${r.ok ? "text-green-400" : "text-amber-400"}`}>{r.ok ? "OK" : "Check"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
