export const metadata = { title: "Terms of Use — NSR Elite" };

const UPDATED = "June 18, 2026";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-zinc-200">
      <h1 className="text-2xl font-bold">Terms of Use</h1>
      <p className="mt-1 text-sm text-zinc-500">Last updated: {UPDATED}</p>

      <section className="mt-6 space-y-5 text-sm leading-relaxed text-zinc-300">
        <p>
          These Terms govern your use of NSR Elite (&quot;the App&quot;), provided by New Standard
          Restoration (&quot;we&quot;, &quot;us&quot;). By using the App you agree to these Terms.
        </p>

        <h2 className="text-base font-semibold text-white">License</h2>
        <p>The App is provided to authorized staff and field representatives for business use. We grant you a limited, revocable, non-transferable right to use the App for that purpose.</p>

        <h2 className="text-base font-semibold text-white">Acceptable use</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Use the App only for lawful canvassing and sales activities on our behalf.</li>
          <li>Do not misuse homeowner or property data; follow all applicable laws, including those governing calls, texts, and do-not-contact requests.</li>
          <li>Do not attempt to access accounts or data that are not yours, or interfere with the App&apos;s operation.</li>
          <li>Keep your login credentials confidential.</li>
        </ul>

        <h2 className="text-base font-semibold text-white">Data you enter</h2>
        <p>You are responsible for the accuracy and lawful use of the information you enter or access through the App.</p>

        <h2 className="text-base font-semibold text-white">Intellectual property</h2>
        <p>The App and its content are owned by New Standard Restoration and its licensors.</p>

        <h2 className="text-base font-semibold text-white">Disclaimer &amp; limitation of liability</h2>
        <p>The App is provided &quot;as is&quot; without warranties of any kind. To the maximum extent permitted by law, we are not liable for indirect or consequential damages arising from your use of the App. Property and contact data from third-party providers are estimates and may be inaccurate.</p>

        <h2 className="text-base font-semibold text-white">Termination</h2>
        <p>We may suspend or terminate access at any time. You may stop using the App and delete your account at any time.</p>

        <h2 className="text-base font-semibold text-white">Contact</h2>
        <p>
          New Standard Restoration —{" "}
          <a href="mailto:info@newstandardrestoration.com" className="text-nsr-blue">info@newstandardrestoration.com</a>
        </p>
      </section>
    </main>
  );
}
