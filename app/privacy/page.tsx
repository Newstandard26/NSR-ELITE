export const metadata = { title: "Privacy Policy — NSR Elite" };

const UPDATED = "June 18, 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-zinc-200">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p className="mt-1 text-sm text-zinc-500">Last updated: {UPDATED}</p>

      <section className="prose-invert mt-6 space-y-5 text-sm leading-relaxed text-zinc-300">
        <p>
          NSR Elite (&quot;the App&quot;) is a field canvassing tool operated by New Standard
          Restoration (&quot;we&quot;, &quot;us&quot;). The App is provided to our staff and authorized
          field representatives. This policy explains what we collect, how we use it, and the
          choices you have.
        </p>

        <h2 className="text-base font-semibold text-white">Information we collect</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Account information</strong> — your name, email, role, and password (stored only as a secure hash).</li>
          <li><strong>Precise location</strong> — when you use the map, we collect your device&apos;s GPS location to show your position and log canvassing activity. Location is collected <strong>only while you are using the App</strong>; we do not track your location in the background.</li>
          <li><strong>Photos</strong> — images you capture or attach to a lead.</li>
          <li><strong>Lead &amp; property data</strong> — addresses, homeowner names, and contact details you enter, and property information (owner, value, characteristics, and, where enabled, appended contact data) retrieved from third-party data providers.</li>
          <li><strong>Usage data</strong> — sign-ins and in-app activity, used for team analytics and security.</li>
          <li><strong>Device data</strong> — basic technical information needed to operate the App.</li>
        </ul>

        <h2 className="text-base font-semibold text-white">How we use information</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>To operate the canvassing map, leads, appointments, and reporting features.</li>
          <li>To assign and track leads, and to measure team activity and adoption.</li>
          <li>To sync leads with our CRM (AccuLynx) and to send transactional emails (such as account invites).</li>
          <li>To secure the App and prevent misuse.</li>
        </ul>

        <h2 className="text-base font-semibold text-white">How we share information</h2>
        <p>
          We share data with service providers that power the App, including our CRM (AccuLynx),
          property-data providers (such as ATTOM), our email provider, and our hosting and database
          providers. We do not sell personal information. We may disclose information if required by
          law.
        </p>

        <h2 className="text-base font-semibold text-white">Data retention</h2>
        <p>
          We retain information for as long as needed to provide the App and for legitimate business
          and legal purposes. You may request deletion as described below.
        </p>

        <h2 className="text-base font-semibold text-white">Your choices &amp; account deletion</h2>
        <p>
          You can delete your account at any time from <strong>Profile → Delete account</strong> inside
          the App. Deleting your account removes your personal information (name, email, login
          credentials) and your location history, and disables access. Some records you created (such
          as leads) may be retained in anonymized form for business and legal purposes. You may also
          request deletion by emailing{" "}
          <a href="mailto:info@newstandardrestoration.com" className="text-nsr-blue">info@newstandardrestoration.com</a>.
        </p>

        <h2 className="text-base font-semibold text-white">Security</h2>
        <p>Data is encrypted in transit, and passwords are stored only as hashes. No system is perfectly secure, but we take reasonable measures to protect your information.</p>

        <h2 className="text-base font-semibold text-white">Children</h2>
        <p>The App is intended for authorized adult staff and is not directed to children under 16.</p>

        <h2 className="text-base font-semibold text-white">Changes</h2>
        <p>We may update this policy and will revise the date above when we do.</p>

        <h2 className="text-base font-semibold text-white">Contact</h2>
        <p>
          New Standard Restoration —{" "}
          <a href="mailto:info@newstandardrestoration.com" className="text-nsr-blue">info@newstandardrestoration.com</a>
        </p>
      </section>
    </main>
  );
}
