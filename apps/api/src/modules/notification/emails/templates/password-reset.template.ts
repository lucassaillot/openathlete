import { EmailLanguage } from '@openathlete/shared';

import { Language } from 'src/common/constants/languages.constant';

import { button, h1, note, p } from '../core/blocks';
import { layout } from '../core/layout';

const translations = {
  FR: {
    title: 'Réinitialiser votre mot de passe',
    preview: 'Réinitialisez votre mot de passe Team Running Rouxmesnil',
    description:
      'Nous avons reçu une demande pour réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.',
    buttonLabel: 'Choisir un nouveau mot de passe',
    linkNote: (url: string) =>
      `Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur: ${url}`,
    ignoreNote:
      "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.",
  },
  EN: {
    title: 'Reset your password',
    preview: 'Reset your Team Running Rouxmesnil password',
    description:
      'We received a request to reset your password. Click the button below to create a new password.',
    buttonLabel: 'Choose a new password',
    linkNote: (url: string) =>
      `If the button doesn't work, copy and paste this link into your browser: ${url}`,
    ignoreNote: "If you didn't make this request, you can ignore this email.",
  },
  IT: {
    title: 'Reimposta la tua password',
    preview: 'Reimposta la tua password di Team Running Rouxmesnil',
    description:
      'Abbiamo ricevuto una richiesta di reimpostazione della tua password. Clicca sul pulsante qui sotto per crearne una nuova.',
    buttonLabel: 'Scegli una nuova password',
    linkNote: (url: string) =>
      `Se il pulsante non funziona, copia e incolla questo link nel tuo browser: ${url}`,
    ignoreNote:
      'Se non hai effettuato questa richiesta, puoi ignorare questa email.',
  },
} as const;

export function buildPasswordResetEmail({
  url,
  language = Language.FR,
}: {
  url: string;
  language?: EmailLanguage;
}) {
  const t = translations[language];
  const title = t.title;
  const preview = t.preview;

  const content = [
    h1(title),
    p(t.description),
    button({ href: url, label: t.buttonLabel }),
    note(t.linkNote(url)),
    note(t.ignoreNote),
  ].join('');

  return layout({ title, preview, contentHtml: content });
}
