import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Privacy Policy',
    description:
      'Privacy Policy for My Flow Check. Your data stays on your phone. We never collect, store, or transmit any personal or health information.',
    alternates: {
      canonical: `/${locale}/privacy`,
    },
  };
}

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-surface min-h-dvh">
      <div className="max-w-lg mx-auto px-4 py-6 pb-28">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/"
            className="flex items-center gap-1 text-ipc-600 hover:text-ipc-800 transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="text-base font-medium">Back</span>
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-ipc-950 mb-1">Privacy Policy</h1>
        <p className="text-xs text-ipc-400 mb-6">Last updated: March 2026</p>

        <div className="space-y-6 text-sm text-ipc-700 leading-relaxed">
          {/* Intro */}
          <section>
            <p>
              Integrated Pelvic Care Inc. (&quot;IPC&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates <strong>My Flow Check</strong> (the &quot;App&quot;). This Privacy Policy explains how we handle information when you use the App.
            </p>
            <p className="mt-2 p-3 rounded-xl bg-success-light border border-success/20 text-success font-medium">
              The short version: Your data stays on your phone. We do not collect, store, transmit, or have access to any of your personal or health information. Ever.
            </p>
          </section>

          {/* 1. Information We Collect */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">1. Information We Collect</h2>
            <p className="font-semibold text-ipc-900 mb-1">We collect no personal data.</p>
            <p>
              My Flow Check is designed with a privacy-first approach. The App runs entirely on your device (phone, tablet, or computer) and does not require:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>An account, username, or password</li>
              <li>An email address, phone number, or name</li>
              <li>Any sign-up or registration</li>
              <li>An internet connection to function</li>
            </ul>
          </section>

          {/* 2. How Your Data Is Stored */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">2. How Your Data Is Stored</h2>
            <p>
              All data you enter into the App, including fluid intake, bathroom visits, bedtimes, wake times, and any notes, is stored exclusively in your device&apos;s local storage (browser storage). This means:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li><strong>No servers.</strong> Your data is never uploaded to any server, cloud service, or database operated by IPC or any third party.</li>
              <li><strong>No transmission.</strong> Your data never leaves your device unless you explicitly choose to export it (see Section 4).</li>
              <li><strong>No remote access.</strong> IPC employees, contractors, or affiliates cannot access, view, or retrieve your data at any time.</li>
              <li><strong>Device-only.</strong> If you clear your browser data or uninstall the App, your data will be permanently deleted and cannot be recovered by us.</li>
            </ul>
          </section>

          {/* 3. Health Information */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">3. Health Information</h2>
            <p>
              The App allows you to record information related to your bladder and fluid intake patterns. This information may be considered health-related data. We want to be clear:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>We <strong>never</strong> collect, process, store, or have access to your health information.</li>
              <li>Your health data remains solely on your device under your control.</li>
              <li>We do not sell, share, license, or disclose any user data to any third party, because we do not have any user data.</li>
            </ul>
          </section>

          {/* 4. Data Export */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">4. Data Export &amp; Sharing</h2>
            <p>
              The App provides an optional export feature that allows you to download your diary data as a PDF or CSV file. When you use this feature:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>The file is generated entirely on your device.</li>
              <li>The file is saved to your device&apos;s local downloads folder.</li>
              <li>Only you decide whether, when, and with whom to share the exported file (for example, with your health professional).</li>
              <li>IPC has no knowledge of whether you export your data or who you share it with.</li>
            </ul>
          </section>

          {/* 5. Cookies & Analytics */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">5. Cookies, Analytics &amp; Tracking</h2>
            <p>
              My Flow Check does <strong>not</strong> use:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Cookies (tracking or otherwise)</li>
              <li>Analytics services (Google Analytics, Mixpanel, etc.)</li>
              <li>Advertising networks or ad trackers</li>
              <li>Social media tracking pixels</li>
              <li>Fingerprinting or any user identification technology</li>
            </ul>
            <p className="mt-2">
              The App uses browser local storage solely to save your diary entries on your device. This is not a cookie and is not accessible to any website or service other than the App itself.
            </p>
          </section>

          {/* 6. Notifications */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">6. Notifications</h2>
            <p>
              If you grant notification permission, the App may send you local reminders to help you remember to log your entries. These notifications are:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Generated entirely on your device</li>
              <li>Not sent through any external server or push notification service</li>
              <li>Optional. You can decline or revoke permission at any time through your device settings.</li>
            </ul>
          </section>

          {/* 7. Children */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">7. Children&apos;s Privacy</h2>
            <p>
              The App is intended for adults and is designed to be used under the guidance of a health professional. We do not knowingly collect information from children under the age of 13. Since we do not collect any personal information from any user, this policy applies equally to all age groups.
            </p>
          </section>

          {/* 8. Third Parties */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">8. Third-Party Services</h2>
            <p>
              The App does not integrate with or transmit data to any third-party services. The App does not contain any third-party SDKs that collect user data. The App may load fonts from Google Fonts for display purposes; no personal data is transmitted in this process.
            </p>
          </section>

          {/* 9. Data Retention */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">9. Data Retention &amp; Deletion</h2>
            <p>
              Since all data is stored locally on your device:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li><strong>You control retention.</strong> Your data exists for as long as you keep it on your device.</li>
              <li><strong>You control deletion.</strong> You can delete all data at any time by tapping &quot;Start a New Tracking&quot; in the App, clearing your browser data, or uninstalling the App.</li>
              <li><strong>We cannot retain your data</strong> because we never receive it.</li>
            </ul>
          </section>

          {/* 10. Security */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">10. Security</h2>
            <p>
              Because your data never leaves your device, the primary security responsibility rests with your device&apos;s own security measures (screen lock, device encryption, etc.). We recommend:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Keeping your device&apos;s operating system and browser up to date</li>
              <li>Using a screen lock (PIN, fingerprint, or face recognition)</li>
              <li>Not sharing your device with others if you have private health data in the App</li>
            </ul>
          </section>

          {/* 11. Changes */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be reflected in the &quot;Last updated&quot; date at the top of this page. Since we do not collect contact information, we cannot directly notify you of changes. We encourage you to review this policy periodically.
            </p>
          </section>

          {/* 12. Your Rights */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">12. Your Rights</h2>
            <p>
              Depending on your jurisdiction, you may have rights regarding your personal data, including rights of access, correction, deletion, and portability. Since we do not collect or store any personal data, these rights are inherently fulfilled. You have complete control over all your data at all times, directly on your device.
            </p>
          </section>

          {/* 13. Contact */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">13. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact:
            </p>
            <div className="mt-2 p-3 rounded-xl bg-ipc-50 border border-ipc-100">
              <p className="font-semibold text-ipc-900">Integrated Pelvic Care Inc.</p>
              <p className="text-ipc-600 mt-1">Email: privacy@integratedpelviccare.com</p>
            </div>
          </section>

          {/* Closing */}
          <section className="pt-4 border-t border-ipc-100">
            <p className="text-xs text-ipc-400 text-center">
              &copy; {new Date().getFullYear()} Integrated Pelvic Care Inc. All rights reserved.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
