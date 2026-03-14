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
    title: 'Terms of Use',
    description:
      'Terms of Use for My Flow Check. This app is for personal tracking only and does not provide medical advice, diagnosis, or treatment.',
    alternates: {
      canonical: `/${locale}/terms`,
    },
  };
}

export default async function TermsOfUsePage({
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

        <h1 className="text-2xl font-bold text-ipc-950 mb-1">Terms of Use</h1>
        <p className="text-xs text-ipc-400 mb-6">Last updated: March 2026</p>

        <div className="space-y-6 text-sm text-ipc-700 leading-relaxed">
          {/* Intro */}
          <section>
            <p>
              Welcome to <strong>My Flow Check</strong> (the &quot;App&quot;), operated by Integrated Pelvic Care Inc. (&quot;IPC&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By accessing or using the App, you agree to be bound by these Terms of Use (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the App.
            </p>
          </section>

          {/* 1. Acceptance */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">1. Acceptance of Terms</h2>
            <p>
              By downloading, installing, accessing, or using the App, you acknowledge that you have read, understood, and agree to be bound by these Terms and our <Link href="/privacy" className="text-ipc-600 underline underline-offset-2 hover:text-ipc-800">Privacy Policy</Link>. These Terms constitute a legally binding agreement between you and IPC. We reserve the right to modify these Terms at any time, and your continued use of the App after such modifications constitutes acceptance of the updated Terms.
            </p>
          </section>

          {/* 2. Description */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">2. Description of the App</h2>
            <p>
              My Flow Check is a personal tracking tool that allows users to record fluid intake, bathroom visits, bedtimes, and wake times over a 3-day period. The App generates a summary of your recorded data that you may optionally share with a health professional. The App is designed as a supplementary tool to support conversations with your healthcare provider.
            </p>
          </section>

          {/* 3. Not Medical */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">3. Not Medical Advice</h2>
            <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-medium mb-3">
              My Flow Check is NOT a medical device, diagnostic tool, or treatment platform. It does not provide medical advice, diagnosis, prognosis, or treatment recommendations of any kind.
            </p>
            <p>
              The App is intended solely for personal informational and educational tracking purposes. Specifically:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>The App does <strong>not</strong> diagnose any medical condition, disease, or disorder.</li>
              <li>The App does <strong>not</strong> recommend, suggest, or imply any course of treatment, medication, or therapy.</li>
              <li>The App does <strong>not</strong> replace professional medical advice, examination, or diagnosis.</li>
              <li>The App does <strong>not</strong> interpret your data or draw medical conclusions from your entries.</li>
              <li>No information presented in the App should be construed as medical advice or a substitute for professional consultation.</li>
            </ul>
            <p className="mt-3 font-semibold text-ipc-900">
              Always seek the advice of a qualified health professional with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay seeking it because of information you have recorded in or obtained from this App.
            </p>
          </section>

          {/* 4. Eligibility */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">4. Eligibility</h2>
            <p>
              The App is intended for use by adults (18 years of age or older) and is designed to be used under the guidance of a health professional. By using the App, you represent and warrant that you are at least 18 years of age. If you are under 18, you may only use the App under the supervision of a parent, guardian, or healthcare provider.
            </p>
          </section>

          {/* 5. User Responsibilities */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">5. User Responsibilities</h2>
            <p>
              When using the App, you agree to:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Use the App only for its intended purpose of personal health tracking.</li>
              <li>Provide accurate information to the best of your ability when logging entries.</li>
              <li>Not rely on the App as a substitute for professional medical care, advice, or diagnosis.</li>
              <li>Consult a qualified health professional before making any health-related decisions based on data recorded in the App.</li>
              <li>Maintain the security of your device, as all data is stored locally on your device.</li>
              <li>Not use the App for any unlawful, harmful, or unauthorized purpose.</li>
              <li>Not attempt to reverse-engineer, decompile, disassemble, or otherwise attempt to derive the source code of the App.</li>
              <li>Not reproduce, distribute, modify, create derivative works of, publicly display, or publicly perform any part of the App without prior written consent from IPC.</li>
            </ul>
          </section>

          {/* 6. Data & Privacy */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">6. Data Ownership &amp; Privacy</h2>
            <p>
              All data you enter into the App is stored exclusively on your device. IPC does not collect, store, access, or transmit any of your personal or health data. You retain full ownership and control over your data at all times. For complete details, please review our <Link href="/privacy" className="text-ipc-600 underline underline-offset-2 hover:text-ipc-800">Privacy Policy</Link>.
            </p>
            <p className="mt-2">
              You acknowledge and understand that:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>If you clear your browser data, uninstall the App, or reset your device, your data will be permanently lost and cannot be recovered by IPC.</li>
              <li>IPC is not responsible for any data loss resulting from device malfunction, browser updates, cache clearing, or any other cause.</li>
              <li>You are solely responsible for exporting and backing up your data if you wish to preserve it.</li>
              <li>When you choose to export and share your data (e.g., with a health professional), you do so at your own discretion and risk.</li>
            </ul>
          </section>

          {/* 7. Export Feature */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">7. Data Export &amp; Sharing</h2>
            <p>
              The App provides an optional export feature that allows you to download your diary data as a file. You acknowledge that:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Any exported data is generated entirely on your device.</li>
              <li>You are solely responsible for how you store, share, and distribute exported data.</li>
              <li>IPC has no control over, and accepts no responsibility for, how you use or share your exported data.</li>
              <li>Once exported, your data is subject to the security measures (or lack thereof) of the platforms or methods you choose to use for storage or transmission.</li>
            </ul>
          </section>

          {/* 8. Intellectual Property */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">8. Intellectual Property</h2>
            <p>
              The App, including but not limited to its design, text, graphics, logos, icons, images, software, code, and overall appearance (&quot;Content&quot;), is the property of Integrated Pelvic Care Inc. and is protected by Canadian and international copyright, trademark, and other intellectual property laws.
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>The &quot;My Flow Check&quot; name and logo are trademarks of IPC.</li>
              <li>You are granted a limited, non-exclusive, non-transferable, revocable license to use the App for personal, non-commercial purposes in accordance with these Terms.</li>
              <li>This license does not include the right to modify, distribute, sell, lease, or create derivative works based on the App or its Content.</li>
            </ul>
          </section>

          {/* 9. Disclaimers */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">9. Disclaimers &amp; Limitation of Liability</h2>
            <p className="uppercase text-xs font-bold text-ipc-500 tracking-wide mb-2">
              IMPORTANT: PLEASE READ CAREFULLY
            </p>
            <div className="p-3 rounded-xl bg-ipc-50 border border-ipc-100 space-y-3">
              <p>
                THE APP IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, COMPLETENESS, NON-INFRINGEMENT, OR AVAILABILITY.
              </p>
              <p>
                IPC DOES NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. IPC DOES NOT WARRANT THE ACCURACY, RELIABILITY, OR COMPLETENESS OF ANY DATA OR INFORMATION DISPLAYED, GENERATED, OR PROCESSED BY THE APP.
              </p>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL IPC, ITS DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, CONTRACTORS, AFFILIATES, OR LICENSORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE APP, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Any health decisions made based on data recorded in the App</li>
                <li>Any delay in seeking medical treatment</li>
                <li>Any misinterpretation of data recorded in the App</li>
                <li>Loss of data stored on your device</li>
                <li>Inaccurate or incomplete data entries</li>
                <li>Any reliance on the App for health-related decision-making</li>
                <li>Device malfunction, browser incompatibility, or software conflicts</li>
                <li>Notification failures or missed reminders</li>
              </ul>
              <p>
                THIS LIMITATION OF LIABILITY APPLIES WHETHER THE ALLEGED LIABILITY IS BASED ON CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR ANY OTHER BASIS, EVEN IF IPC HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
              </p>
            </div>
          </section>

          {/* 10. Indemnification */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">10. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless IPC, its directors, officers, employees, agents, contractors, and affiliates from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or in connection with:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Your use of the App</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any applicable law or regulation</li>
              <li>Any health decisions made based on data recorded in the App</li>
              <li>Your sharing of exported data with third parties</li>
              <li>Any claim that your use of the App caused damage to a third party</li>
            </ul>
          </section>

          {/* 11. Assumption of Risk */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">11. Assumption of Risk</h2>
            <p>
              You expressly acknowledge and agree that your use of the App is at your sole risk. You understand that:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>The App is a personal tracking tool and is not a substitute for professional medical evaluation, advice, diagnosis, or treatment.</li>
              <li>Health conditions require professional medical assessment, and the App cannot and does not provide such assessment.</li>
              <li>Relying solely on data recorded in the App for health decisions could result in harm.</li>
              <li>The accuracy of the data in the App depends entirely on the information you enter, and the App does not verify or validate any entries.</li>
              <li>Local device storage may be subject to data loss from device failure, software updates, or user actions.</li>
            </ul>
          </section>

          {/* 12. Notifications */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">12. Notifications &amp; Reminders</h2>
            <p>
              The App may offer optional local notification reminders to help you log entries. You acknowledge that:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Notifications are provided as a convenience only and are not guaranteed to be delivered.</li>
              <li>IPC is not liable for missed notifications, delayed reminders, or any consequences arising from notification failures.</li>
              <li>You are solely responsible for logging your entries regardless of whether you receive notifications.</li>
              <li>Notification availability depends on your device settings, operating system, and browser support.</li>
            </ul>
          </section>

          {/* 13. Third-Party */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">13. Third-Party Services &amp; Links</h2>
            <p>
              The App may contain links to third-party websites or services that are not owned or controlled by IPC. IPC has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third-party websites or services. You acknowledge and agree that IPC shall not be responsible or liable, directly or indirectly, for any damage or loss caused or alleged to be caused by or in connection with use of or reliance on any such content, goods, or services available on or through any such websites or services.
            </p>
          </section>

          {/* 14. Termination */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">14. Termination</h2>
            <p>
              You may stop using the App at any time. IPC reserves the right to discontinue or modify the App at any time without notice. Since all data is stored locally on your device, discontinuation of the App will not affect data already stored on your device, but you will no longer receive updates or support.
            </p>
          </section>

          {/* 15. Governing Law */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">15. Governing Law &amp; Jurisdiction</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the Province of Ontario and the federal laws of Canada applicable therein, without regard to conflict of law principles. Any dispute arising out of or in connection with these Terms or your use of the App shall be subject to the exclusive jurisdiction of the courts located in the Province of Ontario, Canada.
            </p>
          </section>

          {/* 16. Severability */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">16. Severability</h2>
            <p>
              If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such provision shall be modified to the minimum extent necessary to make it valid, legal, and enforceable. If such modification is not possible, the provision shall be severed from these Terms. The invalidity, illegality, or unenforceability of any provision shall not affect the validity or enforceability of the remaining provisions.
            </p>
          </section>

          {/* 17. Entire Agreement */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">17. Entire Agreement</h2>
            <p>
              These Terms, together with the <Link href="/privacy" className="text-ipc-600 underline underline-offset-2 hover:text-ipc-800">Privacy Policy</Link>, constitute the entire agreement between you and IPC regarding your use of the App and supersede all prior or contemporaneous agreements, understandings, representations, and warranties, whether written or oral, regarding the App.
            </p>
          </section>

          {/* 18. Contact */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">18. Contact Us</h2>
            <p>
              If you have any questions about these Terms of Use, please contact:
            </p>
            <div className="mt-2 p-3 rounded-xl bg-ipc-50 border border-ipc-100">
              <p className="font-semibold text-ipc-900">Integrated Pelvic Care Inc.</p>
              <p className="text-ipc-600 mt-1">Email: legal@integratedpelviccare.com</p>
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
