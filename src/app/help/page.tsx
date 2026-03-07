'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

const FAQ_ITEMS = [
  {
    q: 'What is a bladder diary?',
    a: 'A bladder diary is a 3-day record of your fluid intake (what and how much you drink), your voids (when and how much you urinate), and when you go to bed. This helps your clinician understand your bladder habits and recommend the best treatment.',
  },
  {
    q: 'How do I log a void?',
    a: 'Tap the + button at the bottom of the screen, then tap "Void". Enter the volume (you can use a measuring jug), select how urgently you needed to go (0 = no sensation, 4 = urgent/leak), and tap Save.',
  },
  {
    q: 'How do I measure the volume?',
    a: 'Your clinician may provide a measuring jug. Void into the jug, read the volume in millilitres, then enter it in the app. Common volumes: a small glass is about 150 mL, a standard glass is 250 mL.',
  },
  {
    q: 'What do the sensation numbers mean?',
    a: '0 = No sensation (you went just in case), 1 = First awareness (slight feeling), 2 = Normal desire (comfortable need), 3 = Strong desire (hard to hold), 4 = Urgent with possible leak.',
  },
  {
    q: 'Why should I log bedtime?',
    a: 'Logging your bedtime helps your clinician distinguish between daytime and nighttime voids. Night-time voids (nocturia) may need different treatment.',
  },
  {
    q: 'What happens after 3 days?',
    a: 'Go to the Summary tab to review your diary. You can download a PDF or CSV file to share with your clinician at your next appointment.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. All your data is stored only on your phone and is never sent to any server. When you export your diary, only you decide who to share it with.',
  },
  {
    q: 'Can I edit or delete an entry?',
    a: 'Yes. On the day timeline, tap the trash icon next to any entry to delete it. You can then re-add it with the correct information.',
  },
  {
    q: 'What if I forget to log something?',
    a: "No worries! You can add entries at any time and adjust the time to when it actually happened. Just tap the + button and change the time before saving.",
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-dvh bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-ipc-100">
        <div className="max-w-lg mx-auto flex items-center px-4 h-14">
          <Link
            href="/diary/day/1"
            className="flex items-center gap-1 text-ipc-600 hover:text-ipc-800 transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="text-base font-medium">Back</span>
          </Link>
          <h1 className="flex-1 text-center text-lg font-bold text-ipc-900 pr-12">
            Help & FAQ
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-12">
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

        <div className="mt-8 text-center">
          <p className="text-sm text-ipc-400">
            Still have questions? Ask your clinician.
          </p>
        </div>
      </main>
    </div>
  );
}
