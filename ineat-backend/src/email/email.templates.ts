const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character] ?? character,
  );

export type WeeklyProductDigestItem = {
  name: string;
  quantity: number;
  detail: string;
};

export type WeeklyProductDigestInput = {
  firstName?: string | null;
  expired: WeeklyProductDigestItem[];
  expiringSoon: WeeklyProductDigestItem[];
  recentlyAdded: WeeklyProductDigestItem[];
  totals: { expired: number; expiringSoon: number; recentlyAdded: number };
  budget?: {
    spent: number;
    amount: number;
    remaining: number;
    percentage: number;
  };
  inventoryUrl: string;
  budgetUrl: string;
};

export type DailyProductDigestInput = {
  firstName?: string | null;
  urgentItems: WeeklyProductDigestItem[];
  totalUrgentItems: number;
  budgetAlert?: string;
  inventoryUrl: string;
  budgetUrl: string;
};

export type TrialEmailInput = {
  firstName?: string | null;
  trialEndsAt: Date;
  subscriptionUrl: string;
};

export type BillingEmailInput = {
  firstName?: string | null;
  subscriptionUrl: string;
  periodEndsAt?: Date | null;
  billingInterval?: 'MONTHLY' | 'YEARLY' | null;
};

export type QuotaEmailInput = {
  firstName?: string | null;
  usageLabel: string;
  usedCount: number;
  limit: number;
  resetsAt: Date;
  subscriptionUrl: string;
};

export type AccountDeletedEmailInput = {
  firstName?: string | null;
};

const formatFrenchDate = (value: Date) =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeZone: 'Europe/Paris',
  }).format(value);

const createTrialEmailLayout = (input: {
  greeting: string;
  preview: string;
  title: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
  footer: string;
}) => `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f6f7f4;color:#1f2933;font-family:Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(input.preview)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f4;padding:32px 16px"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px"><tr><td>
      <p style="margin:0 0 20px;font-size:16px">${escapeHtml(input.greeting)}</p>
      <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">${escapeHtml(input.title)}</h1>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.6">${escapeHtml(input.body)}</p>
      <p style="margin:0 0 24px"><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;background:#2f6b3c;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:8px">${escapeHtml(input.actionLabel)}</a></p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#7b8794">${escapeHtml(input.footer)}</p>
    </td></tr></table>
  </td></tr></table>
</body></html>`;

export function createTrialStartedEmail(input: TrialEmailInput) {
  const greeting = input.firstName?.trim()
    ? `Bonjour ${input.firstName.trim()},`
    : 'Bonjour,';
  const endDate = formatFrenchDate(input.trialEndsAt);
  const body = `Votre essai Premium de 3 jours est actif jusqu’au ${endDate}. Vous avez accès aux fonctionnalités Premium sans carte bancaire.`;
  return {
    subject: 'Votre essai Premium InEat commence',
    text: `${greeting}\n\n${body}\n\nDécouvrir Premium : ${input.subscriptionUrl}`,
    html: createTrialEmailLayout({
      greeting,
      preview: 'Votre essai Premium est actif.',
      title: 'Bienvenue dans Premium',
      body,
      actionLabel: 'Découvrir Premium',
      actionUrl: input.subscriptionUrl,
      footer: 'Nous vous préviendrons avant la fin de votre essai.',
    }),
  };
}

export function createTrialReminderEmail(input: TrialEmailInput) {
  const greeting = input.firstName?.trim()
    ? `Bonjour ${input.firstName.trim()},`
    : 'Bonjour,';
  const body = `Votre essai Premium se termine demain, le ${formatFrenchDate(input.trialEndsAt)}. Abonnez-vous pour conserver l’accès aux fonctionnalités Premium.`;
  return {
    subject: 'Votre essai Premium se termine demain',
    text: `${greeting}\n\n${body}\n\nVoir les offres : ${input.subscriptionUrl}`,
    html: createTrialEmailLayout({
      greeting,
      preview: 'Votre essai Premium se termine demain.',
      title: 'Plus qu’un jour d’essai',
      body,
      actionLabel: 'Voir les offres',
      actionUrl: input.subscriptionUrl,
      footer:
        'Sans abonnement, votre compte repassera automatiquement à l’offre gratuite.',
    }),
  };
}

export function createTrialExpiredEmail(input: TrialEmailInput) {
  const greeting = input.firstName?.trim()
    ? `Bonjour ${input.firstName.trim()},`
    : 'Bonjour,';
  const body =
    'Votre essai Premium est terminé. Vos données restent disponibles et vous pouvez continuer à utiliser InEat avec l’offre gratuite.';
  return {
    subject: 'Votre essai Premium InEat est terminé',
    text: `${greeting}\n\n${body}\n\nPasser à Premium : ${input.subscriptionUrl}`,
    html: createTrialEmailLayout({
      greeting,
      preview: 'Votre essai Premium est terminé.',
      title: 'Votre essai est terminé',
      body,
      actionLabel: 'Passer à Premium',
      actionUrl: input.subscriptionUrl,
      footer:
        'Vous pouvez vous abonner à tout moment depuis votre espace InEat.',
    }),
  };
}

const billingGreeting = (firstName?: string | null) =>
  firstName?.trim() ? `Bonjour ${firstName.trim()},` : 'Bonjour,';

export function createAccountDeletedEmail(input: AccountDeletedEmailInput) {
  const greeting = billingGreeting(input.firstName);
  const body =
    'Votre compte InEat et les données associées ont été supprimés. Certains documents restent conservés conformément à nos obligations légales.';
  return {
    subject: 'Votre compte InEat a été supprimé',
    text: `${greeting}\n\n${body}`,
    html: createTrialEmailLayout({
      greeting,
      preview: 'Votre compte InEat a été supprimé.',
      title: 'Suppression confirmée',
      body,
      actionLabel: 'Retourner sur InEat',
      actionUrl: 'https://ineat.store',
      footer:
        'Les documents conservés ne sont pas utilisés à des fins commerciales.',
    }),
  };
}

export function createPremiumActivatedEmail(input: BillingEmailInput) {
  const greeting = billingGreeting(input.firstName);
  const interval = input.billingInterval === 'YEARLY' ? 'annuel' : 'mensuel';
  const body = `Votre abonnement Premium ${interval} est actif. Vous pouvez dès maintenant profiter de toutes les fonctionnalités Premium InEat.`;
  return {
    subject: 'Votre abonnement Premium InEat est actif',
    text: `${greeting}\n\n${body}\n\nGérer mon abonnement : ${input.subscriptionUrl}`,
    html: createTrialEmailLayout({
      greeting,
      preview: 'Votre abonnement Premium est actif.',
      title: 'Bienvenue dans Premium',
      body,
      actionLabel: 'Gérer mon abonnement',
      actionUrl: input.subscriptionUrl,
      footer:
        'Les reçus et factures sont disponibles dans votre portail de facturation.',
    }),
  };
}

export function createPaymentFailedEmail(input: BillingEmailInput) {
  const greeting = billingGreeting(input.firstName);
  const body =
    'Le paiement de votre abonnement Premium a échoué. Mettez à jour votre moyen de paiement pour éviter une interruption de service.';
  return {
    subject: 'Action requise : paiement InEat échoué',
    text: `${greeting}\n\n${body}\n\nMettre à jour mon paiement : ${input.subscriptionUrl}`,
    html: createTrialEmailLayout({
      greeting,
      preview: 'Votre paiement InEat a échoué.',
      title: 'Mettez à jour votre paiement',
      body,
      actionLabel: 'Mettre à jour mon paiement',
      actionUrl: input.subscriptionUrl,
      footer:
        'Si vous avez déjà régularisé la situation, aucune action supplémentaire n’est nécessaire.',
    }),
  };
}

export function createSubscriptionCancelledEmail(
  input: BillingEmailInput,
  effective: boolean,
) {
  const greeting = billingGreeting(input.firstName);
  const endDate = input.periodEndsAt
    ? formatFrenchDate(input.periodEndsAt)
    : null;
  const body = effective
    ? 'Votre abonnement Premium est terminé. Vos données restent disponibles avec l’offre gratuite.'
    : `La résiliation de votre abonnement Premium est enregistrée${endDate ? `. Vous conserverez Premium jusqu’au ${endDate}` : ''}.`;
  return {
    subject: effective
      ? 'Votre abonnement Premium est terminé'
      : 'Résiliation de votre abonnement Premium confirmée',
    text: `${greeting}\n\n${body}\n\nGérer mon abonnement : ${input.subscriptionUrl}`,
    html: createTrialEmailLayout({
      greeting,
      preview: effective
        ? 'Votre abonnement Premium est terminé.'
        : 'Votre résiliation est enregistrée.',
      title: effective
        ? 'Votre abonnement est terminé'
        : 'Résiliation enregistrée',
      body,
      actionLabel: effective ? 'Voir les offres' : 'Gérer mon abonnement',
      actionUrl: input.subscriptionUrl,
      footer:
        'Vous pouvez vous réabonner à tout moment depuis votre espace InEat.',
    }),
  };
}

export function createSubscriptionChangedEmail(input: BillingEmailInput) {
  const greeting = billingGreeting(input.firstName);
  const interval =
    input.billingInterval === 'YEARLY' ? 'annuelle' : 'mensuelle';
  const body = `Votre formule de facturation Premium est désormais ${interval}. Le détail et la date de prise d’effet sont disponibles dans votre portail de facturation.`;
  return {
    subject: 'Votre abonnement Premium a été modifié',
    text: `${greeting}\n\n${body}\n\nVoir les détails : ${input.subscriptionUrl}`,
    html: createTrialEmailLayout({
      greeting,
      preview: 'Votre abonnement Premium a été modifié.',
      title: 'Abonnement modifié',
      body,
      actionLabel: 'Voir les détails',
      actionUrl: input.subscriptionUrl,
      footer:
        'Le portail Stripe présente le détail de votre prochaine échéance.',
    }),
  };
}

export function createQuotaEmail(input: QuotaEmailInput, reached: boolean) {
  const greeting = billingGreeting(input.firstName);
  const resetDate = formatFrenchDate(input.resetsAt);
  const body = reached
    ? `Vous avez utilisé vos ${input.limit} ${input.usageLabel}. Votre quota sera renouvelé le ${resetDate}.`
    : `Vous avez utilisé ${input.usedCount} de vos ${input.limit} ${input.usageLabel}. Votre quota sera renouvelé le ${resetDate}.`;
  return {
    subject: reached
      ? 'Votre quota InEat est atteint'
      : 'Votre quota InEat est bientôt atteint',
    text: `${greeting}\n\n${body}\n\nVoir mon abonnement : ${input.subscriptionUrl}`,
    html: createTrialEmailLayout({
      greeting,
      preview: reached
        ? 'Votre quota InEat est atteint.'
        : 'Votre quota InEat est bientôt atteint.',
      title: reached ? 'Quota atteint' : 'Quota bientôt atteint',
      body,
      actionLabel: 'Voir mon abonnement',
      actionUrl: input.subscriptionUrl,
      footer:
        'Vous pouvez consulter à tout moment votre utilisation depuis votre compte.',
    }),
  };
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
    value,
  );

const renderDigestSection = (
  title: string,
  items: WeeklyProductDigestItem[],
  total: number,
  url: string,
) => {
  if (total === 0) return '';
  const rows = items
    .map(
      (item) =>
        `<li style="margin:0 0 8px"><strong>${escapeHtml(item.name)}</strong> · ${escapeHtml(item.detail)} · quantité ${escapeHtml(String(item.quantity))}</li>`,
    )
    .join('');
  const more =
    total > items.length
      ? `<p style="margin:8px 0 0"><a href="${escapeHtml(url)}" style="color:#2f6b3c">Voir les ${total - items.length} autres</a></p>`
      : '';
  return `<h2 style="margin:24px 0 10px;font-size:18px">${escapeHtml(title)}</h2><ul style="margin:0;padding-left:20px;line-height:1.5">${rows}</ul>${more}`;
};

export function createWeeklyProductDigestEmail(
  input: WeeklyProductDigestInput,
) {
  const firstName = input.firstName?.trim();
  const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
  const inventoryUrl = escapeHtml(input.inventoryUrl);
  const budgetUrl = escapeHtml(input.budgetUrl);
  const itemText = (items: WeeklyProductDigestItem[]) =>
    items
      .map(
        (item) => `- ${item.name} · ${item.detail} · quantité ${item.quantity}`,
      )
      .join('\n');
  const sections = [
    input.totals.expired
      ? `Produits périmés (${input.totals.expired})\n${itemText(input.expired)}`
      : '',
    input.totals.expiringSoon
      ? `À consommer dans les 7 jours (${input.totals.expiringSoon})\n${itemText(input.expiringSoon)}`
      : '',
    input.budget
      ? `Budget\n${formatMoney(input.budget.spent)} dépensés sur ${formatMoney(input.budget.amount)} (${input.budget.percentage} %). Reste ${formatMoney(input.budget.remaining)}.`
      : '',
    input.totals.recentlyAdded
      ? `Ajoutés cette semaine (${input.totals.recentlyAdded})\n${itemText(input.recentlyAdded)}`
      : '',
  ].filter(Boolean);

  const budgetHtml = input.budget
    ? `<h2 style="margin:24px 0 10px;font-size:18px">Votre budget</h2><p style="margin:0 0 8px;line-height:1.6"><strong>${formatMoney(input.budget.spent)}</strong> dépensés sur ${formatMoney(input.budget.amount)} (${input.budget.percentage} %). Il vous reste ${formatMoney(input.budget.remaining)}.</p><p style="margin:0"><a href="${budgetUrl}" style="color:#2f6b3c">Voir mon budget</a></p>`
    : '';

  return {
    subject: 'Votre semaine InEat : produits à consommer et budget',
    text: `${greeting}\n\nVoici les informations utiles pour préparer votre semaine.\n\n${sections.join('\n\n')}\n\nVoir mon inventaire : ${input.inventoryUrl}${input.budget ? `\nVoir mon budget : ${input.budgetUrl}` : ''}`,
    html: `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#f6f7f4;color:#1f2933;font-family:Arial,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden">Les produits à consommer et votre budget pour la semaine.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f4;padding:32px 16px"><tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;padding:32px"><tr><td>
        <p style="margin:0 0 20px;font-size:16px">${escapeHtml(greeting)}</p>
        <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25">Préparez votre semaine avec InEat</h1>
        <p style="margin:0 0 20px;font-size:16px;line-height:1.6">Voici les informations utiles de votre inventaire.</p>
        ${renderDigestSection('À consommer maintenant', input.expired, input.totals.expired, input.inventoryUrl)}
        ${renderDigestSection('À consommer dans les 7 jours', input.expiringSoon, input.totals.expiringSoon, input.inventoryUrl)}
        ${budgetHtml}
        ${renderDigestSection('Ajoutés cette semaine', input.recentlyAdded, input.totals.recentlyAdded, input.inventoryUrl)}
        <p style="margin:28px 0 0"><a href="${inventoryUrl}" style="display:inline-block;background:#2f6b3c;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:8px">Voir mon inventaire</a></p>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#7b8794">Vous pouvez désactiver ce récapitulatif dans les paramètres de notification InEat.</p>
      </td></tr></table>
    </td></tr></table>
  </body>
</html>`,
  };
}

export function createDailyProductDigestEmail(input: DailyProductDigestInput) {
  const firstName = input.firstName?.trim();
  const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
  const inventoryUrl = escapeHtml(input.inventoryUrl);
  const budgetUrl = escapeHtml(input.budgetUrl);
  const itemsHtml = input.urgentItems
    .map(
      (item) =>
        `<li style="margin:0 0 8px"><strong>${escapeHtml(item.name)}</strong> · ${escapeHtml(item.detail)} · quantité ${escapeHtml(String(item.quantity))}</li>`,
    )
    .join('');
  const more =
    input.totalUrgentItems > input.urgentItems.length
      ? `<p><a href="${inventoryUrl}" style="color:#2f6b3c">Voir les ${input.totalUrgentItems - input.urgentItems.length} autres</a></p>`
      : '';
  const budgetHtml = input.budgetAlert
    ? `<h2 style="margin:24px 0 10px;font-size:18px">Budget</h2><p style="line-height:1.6">${escapeHtml(input.budgetAlert)}</p><p><a href="${budgetUrl}" style="color:#2f6b3c">Voir mon budget</a></p>`
    : '';
  const itemsText = input.urgentItems
    .map(
      (item) => `- ${item.name} · ${item.detail} · quantité ${item.quantity}`,
    )
    .join('\n');

  return {
    subject: 'Actions du jour dans votre inventaire InEat',
    text: `${greeting}\n\nVoici ce qui demande votre attention aujourd'hui.\n\n${itemsText}${input.budgetAlert ? `\n\nBudget\n${input.budgetAlert}\n${input.budgetUrl}` : ''}\n\nVoir mon inventaire : ${input.inventoryUrl}`,
    html: `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f6f7f4;color:#1f2933;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f4;padding:32px 16px"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;padding:32px"><tr><td>
      <p style="margin:0 0 20px;font-size:16px">${escapeHtml(greeting)}</p>
      <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25">À faire aujourd’hui</h1>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.6">Voici ce qui demande votre attention dans InEat.</p>
      ${itemsHtml ? `<h2 style="margin:24px 0 10px;font-size:18px">Produits urgents</h2><ul style="margin:0;padding-left:20px;line-height:1.5">${itemsHtml}</ul>${more}` : ''}
      ${budgetHtml}
      <p style="margin:28px 0 0"><a href="${inventoryUrl}" style="display:inline-block;background:#2f6b3c;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:8px">Voir mon inventaire</a></p>
      <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#7b8794">Vous recevez ce message car le récapitulatif quotidien est activé dans vos paramètres InEat.</p>
    </td></tr></table>
  </td></tr></table>
</body></html>`,
  };
}

export function createPasswordResetEmail(input: {
  name?: string | null;
  resetUrl: string;
}) {
  const displayName = input.name?.trim();
  const greeting = displayName ? `Bonjour ${displayName},` : 'Bonjour,';
  const safeGreeting = escapeHtml(greeting);
  const safeResetUrl = escapeHtml(input.resetUrl);

  return {
    subject: 'Réinitialisez votre mot de passe InEat',
    text: `${greeting}\n\nUne demande de réinitialisation de votre mot de passe InEat a été effectuée.\n\nChoisissez un nouveau mot de passe : ${input.resetUrl}\n\nCe lien expire dans 60 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
    html: `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#f6f7f4;color:#1f2933;font-family:Arial,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden">Votre lien de réinitialisation InEat expire dans 60 minutes.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f4;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px">
          <tr><td>
            <p style="margin:0 0 20px;font-size:16px">${safeGreeting}</p>
            <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">Réinitialisez votre mot de passe</h1>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.6">Une demande de réinitialisation de votre mot de passe InEat a été effectuée.</p>
            <p style="margin:0 0 24px">
              <a href="${safeResetUrl}" style="display:inline-block;background:#2f6b3c;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:8px">Choisir un nouveau mot de passe</a>
            </p>
            <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#52606d">Ce lien expire dans 60 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
            <p style="margin:0;font-size:12px;line-height:1.6;color:#7b8794;word-break:break-all">Si le bouton ne fonctionne pas, copiez ce lien : ${safeResetUrl}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  };
}

export function createEmailVerificationEmail(input: {
  name?: string | null;
  verificationUrl: string;
}) {
  const displayName = input.name?.trim();
  const greeting = displayName ? `Bonjour ${displayName},` : 'Bonjour,';
  const safeGreeting = escapeHtml(greeting);
  const safeVerificationUrl = escapeHtml(input.verificationUrl);

  return {
    subject: 'Confirmez votre adresse email InEat',
    text: `${greeting}\n\nBienvenue sur InEat. Confirmez votre adresse email pour activer votre compte : ${input.verificationUrl}\n\nCe lien expire dans 60 minutes. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.`,
    html: `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#f6f7f4;color:#1f2933;font-family:Arial,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden">Confirmez votre adresse email InEat dans les 60 minutes.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f4;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px">
          <tr><td>
            <p style="margin:0 0 20px;font-size:16px">${safeGreeting}</p>
            <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">Confirmez votre adresse email</h1>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.6">Bienvenue sur InEat. Confirmez votre adresse pour activer votre compte et commencer à mieux gérer vos produits alimentaires.</p>
            <p style="margin:0 0 24px">
              <a href="${safeVerificationUrl}" style="display:inline-block;background:#2f6b3c;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:8px">Confirmer mon adresse</a>
            </p>
            <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#52606d">Ce lien expire dans 60 minutes. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.</p>
            <p style="margin:0;font-size:12px;line-height:1.6;color:#7b8794;word-break:break-all">Si le bouton ne fonctionne pas, copiez ce lien : ${safeVerificationUrl}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  };
}

export function createWelcomeEmail(input: {
  firstName?: string | null;
  appUrl: string;
}) {
  const firstName = input.firstName?.trim();
  const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
  const safeGreeting = escapeHtml(greeting);
  const safeAppUrl = escapeHtml(input.appUrl);

  return {
    subject: 'Bienvenue sur InEat !',
    text: `${greeting}\n\nVotre compte InEat est prêt. Commencez à mieux gérer vos produits, vos courses et votre budget alimentaire.\n\nOuvrir InEat : ${input.appUrl}\n\nPour bien démarrer :\n1. Ajoutez vos premiers produits.\n2. Scannez une facture.\n3. Définissez votre budget.\n\nUne question ? Répondez simplement à cet email pour contacter le support InEat.`,
    html: `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#f6f7f4;color:#1f2933;font-family:Arial,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden">Votre compte InEat est prêt.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f4;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px">
          <tr><td>
            <p style="margin:0 0 20px;font-size:16px">${safeGreeting}</p>
            <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">Bienvenue sur InEat !</h1>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.6">Votre compte est prêt. InEat vous aide à mieux gérer vos produits, vos courses et votre budget alimentaire.</p>
            <p style="margin:0 0 24px"><a href="${safeAppUrl}" style="display:inline-block;background:#2f6b3c;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:8px">Commencer avec InEat</a></p>
            <h2 style="margin:0 0 12px;font-size:18px">Vos trois premières actions</h2>
            <ol style="margin:0 0 24px;padding-left:22px;font-size:15px;line-height:1.8">
              <li>Ajoutez vos premiers produits.</li>
              <li>Scannez une facture.</li>
              <li>Définissez votre budget.</li>
            </ol>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#52606d">Une question ? Répondez simplement à cet email pour contacter le support InEat.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  };
}

export function createNotificationAlertEmail(input: {
  title: string;
  message: string;
  actionUrl: string;
}) {
  const safeTitle = escapeHtml(input.title);
  const safeMessage = escapeHtml(input.message);
  const safeActionUrl = escapeHtml(input.actionUrl);

  return {
    subject: `${input.title} · InEat`,
    text: `${input.title}\n\n${input.message}\n\nVoir dans InEat : ${input.actionUrl}`,
    html: `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#f6f7f4;color:#1f2933;font-family:Arial,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f4;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px">
          <tr><td>
            <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#2f6b3c;text-transform:uppercase">Alerte InEat</p>
            <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">${safeTitle}</h1>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.6">${safeMessage}</p>
            <p style="margin:0"><a href="${safeActionUrl}" style="display:inline-block;background:#2f6b3c;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:8px">Voir dans InEat</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  };
}
