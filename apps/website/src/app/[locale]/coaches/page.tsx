import { notFound, redirect } from 'next/navigation';

/**
 * /coaches is temporarily redirected to the homepage until we publish
 * real coach customer stories and verifiable testimonials (see clubs page).
 */
export default async function CoachesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (locale !== 'fr') {
    notFound();
  }

  redirect(`/${locale}`);
}
