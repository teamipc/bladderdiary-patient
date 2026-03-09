import type { Metadata } from 'next';
import { ChevronLeft, Mail } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Help & FAQ',
  description:
    'Frequently asked questions about My Flow Check. Learn how to track drinks, bathroom visits, and understand your 3-day bladder diary.',
  alternates: {
    canonical: '/help',
  },
};

const FAQ_ITEMS = [
  {
    q: 'What is this tracker?',
    a: 'It\'s a simple 3-day tool to track when you drink, when you pee, and when you go to bed. This helps your health professional spot patterns and recommend the best next steps for you.',
  },
  {
    q: 'How do I add a pee?',
    a: 'Tap the + button at the bottom of the screen, then tap "Pee". Use the slider to enter how much, rate how strong the urge was, and tap Save.',
  },
  {
    q: 'How do I measure how much?',
    a: 'Your health professional may provide a measuring jug. Pee into the jug, read the volume in millilitres, then enter it in the app. For reference: a small glass is about 150 mL, a standard glass is 250 mL.',
  },
  {
    q: 'What do the urge levels mean?',
    a: 'Not at all = you went just in case. A little = slight feeling. Normal = comfortable need. Quite a bit = hard to hold. Couldn\'t wait = urgent, may have leaked.',
  },
  {
    q: 'Why should I add my bedtime?',
    a: 'Adding your bedtime helps your health professional tell the difference between daytime and nighttime pees. Waking up at night to pee may need a different approach.',
  },
  {
    q: 'What happens after 3 days?',
    a: 'Go to the Summary tab to review your data. You can download a PDF or CSV file to share with your health professional at your next appointment.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. All your data is stored only on your phone and is never sent to any server. When you export your data, only you decide who to share it with.',
  },
  {
    q: 'Can I edit or delete an entry?',
    a: 'Yes. On the day timeline, tap the trash icon next to any entry to delete it. You can then re-add it with the correct information.',
  },
  {
    q: 'What if I forget to add something?',
    a: "No worries! You can add entries at any time and adjust the time to when it actually happened. Just tap the + button and change the time before saving.",
  },
];

export default function HelpPage() {
  return (
    <div className="bg-surface">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-6">
          <Link
            href="/summary"
            className="inline-flex items-center gap-1 text-ipc-600 hover:text-ipc-800 transition-colors mb-3"
          >
            <ChevronLeft size={20} />
            <span className="text-base font-medium">Back</span>
          </Link>
          <h1 className="text-xl font-bold text-ipc-900">
            Help & FAQ
          </h1>
        </div>
        <div className="space-y-4">
          {FAQ_ITEMS.map((item, i) => (
            <details
              key={i}
              className="group rounded-2xl bg-white border border-ipc-100 overflow-hidden"
            >
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer
                list-none text-base font-semibold text-ipc-950
                [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronLeft
                  size={18}
                  className="text-ipc-400 transition-transform -rotate-90
                    group-open:rotate-[-270deg] shrink-0 ml-2"
                />
              </summary>
              <div className="px-5 pb-4 text-base text-ipc-700 leading-relaxed">
                {item.a}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-8 space-y-4 text-center">
          <p className="text-sm text-ipc-400">
            Still have questions? Ask your health professional.
          </p>
          <div className="rounded-2xl bg-white border border-ipc-100 p-4">
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <Mail size={16} className="text-ipc-400" />
              <p className="text-sm font-semibold text-ipc-700">
                Have a suggestion?
              </p>
            </div>
            <p className="text-sm text-ipc-500 leading-relaxed">
              We&apos;d love to hear your ideas for improving the app.
              Send us an email at{' '}
              <a
                href="mailto:info@ipc.health"
                className="text-ipc-600 font-semibold underline underline-offset-2"
              >
                info@ipc.health
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
