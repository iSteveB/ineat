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
