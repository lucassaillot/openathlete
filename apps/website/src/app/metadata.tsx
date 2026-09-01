import { SITE_URL } from '@/config';
import type { Metadata } from 'next';

interface GenerateMetadataOptions {
  locale?: string;
  title?: string;
  description?: string;
  path?: string;
  keywords?: string[];
}

export function generateMetadata(options?: GenerateMetadataOptions): Metadata {
  const {
    title: customTitle,
    description: customDescription,
    path = '',
    keywords,
  } = options || {};

  // Default metadata (French)
  const defaultTitle =
    'OpenAthlete — Alternative européenne open source à TrainingPeaks et Strava';
  const defaultDescription =
    "Plateforme d'endurance sous AGPLv3 : hébergement orienté UE, logique CTL/ATL/TSB lisible dans le code, auto-hébergement et export complet. Développée à Grenoble.";

  // Coaches page metadata
  const coachesTitle = 'OpenAthlete — Pour les coachs';
  const coachesDescription =
    'Cette page est provisoirement retirée. OpenAthlete est une plateforme open source orientée Union européenne.';

  // Clubs page metadata
  const clubsTitle = 'OpenAthlete — Pour les clubs';
  const clubsDescription =
    'Cette page est provisoirement retirée. OpenAthlete est une plateforme open source orientée Union européenne.';

  // Determine title and description based on path
  let title: string;
  let description: string;

  if (path === '/coaches') {
    title = customTitle || coachesTitle;
    description = customDescription || coachesDescription;
  } else if (path === '/clubs') {
    title = customTitle || clubsTitle;
    description = customDescription || clubsDescription;
  } else {
    title = customTitle || defaultTitle;
    description = customDescription || defaultDescription;
  }
  const currentUrl = `${SITE_URL}${path}`;
  // Canonical URL always points to the unprefixed (French) version
  const canonicalUrl = `${SITE_URL}${path}`;

  return {
    title,
    description,
    ...(keywords && { keywords }),
    openGraph: {
      title,
      description,
      url: currentUrl,
      siteName: 'OpenAthlete',
      images: [
        {
          url: `${SITE_URL}/logo_dark.png`,
          width: 1200,
          height: 630,
          alt: 'OpenAthlete',
        },
      ],
      locale: 'fr_FR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${SITE_URL}/logo_dark.png`],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}
