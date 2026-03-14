import { redirect } from 'next/navigation';

export default async function DiaryIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/diary/day/1`);
}
