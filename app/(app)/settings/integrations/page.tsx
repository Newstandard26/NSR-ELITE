// Integration settings. Secrets live in env vars (never the DB); we show masked
// presence so admins can confirm configuration without exposing values.
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

  return (
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
  );
}
