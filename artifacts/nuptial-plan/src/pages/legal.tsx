import { ArrowLeft, ShieldCheck, ScrollText } from 'lucide-react';
import { Link } from 'wouter';
import { LegalFooter } from '@/components/legal-footer';
import { useLanguage } from '@/lib/i18n';

type LegalDocument = 'privacy' | 'policy';

const documents: Record<LegalDocument, {
  eyebrow: string;
  title: string;
  intro: string;
  icon: typeof ShieldCheck;
  sections: Array<{ title: string; body: string[] }>;
}> = {
  privacy: {
    eyebrow: 'Vos données, avec soin',
    title: 'Politique de confidentialité',
    intro: 'Cette politique explique quelles données The Nuptial Plan traite, pourquoi elles sont utilisées et quels sont vos droits.',
    icon: ShieldCheck,
    sections: [
      {
        title: '1. Qui sommes-nous ?',
        body: [
          'The Nuptial Plan est un outil de planification de mariage destiné aux planners et aux équipes qui les accompagnent. La présente politique s’applique aux données traitées lorsque vous utilisez l’application, le site et les services associés.',
          'Les mentions relatives à l’éditeur, à son adresse et à son contact doivent être complétées par l’éditeur du service avant toute mise en ligne définitive.',
        ],
      },
      {
        title: '2. Données que nous pouvons traiter',
        body: [
          'Nous pouvons traiter les informations nécessaires à la création et à la gestion de votre compte : nom, adresse e-mail, photo de profil, identifiant de compte et informations de connexion gérées par notre fournisseur d’authentification.',
          'Nous pouvons également traiter les informations que vous saisissez dans vos dossiers de mariage : noms des mariés, date et lieu du mariage, invités, prestataires, contrats, paiements, événements, notes et documents importés.',
          'Les données techniques nécessaires au fonctionnement et à la sécurité du service peuvent également être enregistrées, comme les journaux de connexion, le type d’appareil, le navigateur et les informations de diagnostic.',
        ],
      },
      {
        title: '3. Pourquoi utilisons-nous vos données ?',
        body: [
          'Vos données sont utilisées pour fournir les fonctionnalités de The Nuptial Plan, enregistrer vos modifications, afficher vos tableaux de bord, sécuriser votre compte, répondre à vos demandes et améliorer la fiabilité du service.',
          'Lorsque vous utilisez une fonctionnalité d’assistance ou de génération de contenu, les informations strictement nécessaires à cette fonctionnalité peuvent être transmises à notre prestataire technique. Nous ne vendons pas vos données personnelles.',
        ],
      },
      {
        title: '4. Hébergement, sécurité et conservation',
        body: [
          'Nous appliquons des mesures techniques et organisationnelles raisonnables pour protéger les données contre l’accès non autorisé, la perte, l’altération ou la divulgation. L’accès aux dossiers est limité au planner auquel ils appartiennent, conformément aux règles de sécurité de l’application.',
          'Les données sont conservées pendant la durée nécessaire à la fourniture du service, à la gestion du compte et au respect des obligations légales. Lorsque vous demandez la suppression d’un dossier ou de votre compte, les données sont supprimées ou anonymisées dans les délais applicables, sous réserve des obligations de conservation.',
        ],
      },
      {
        title: '5. Vos droits',
        body: [
          'Selon votre lieu de résidence et la réglementation applicable, vous pouvez demander l’accès, la rectification, la suppression, la limitation ou la portabilité de vos données, ou vous opposer à certains traitements.',
          'Pour exercer vos droits, contactez l’éditeur à l’adresse e-mail dédiée à la protection des données, qui doit être ajoutée ici avant publication. Vous pouvez également introduire une réclamation auprès de l’autorité de protection des données compétente.',
        ],
      },
      {
        title: '6. Cookies et technologies similaires',
        body: [
          'Le site peut utiliser des cookies ou technologies similaires nécessaires à l’authentification, à la sécurité, au maintien de session et aux préférences de fonctionnement. Les outils de mesure d’audience ou de marketing ne doivent être activés qu’avec les consentements requis par la réglementation applicable.',
        ],
      },
      {
        title: '7. Mise à jour de cette politique',
        body: [
          'Nous pouvons mettre à jour cette politique pour tenir compte de l’évolution du service ou de la réglementation. La date de dernière mise à jour est indiquée ci-dessous. En cas de changement important, nous vous en informerons par un moyen approprié.',
        ],
      },
    ],
  },
  policy: {
    eyebrow: 'Le cadre du service',
    title: 'Conditions générales d’utilisation',
    intro: 'Ces conditions définissent les règles d’accès et d’utilisation de The Nuptial Plan.',
    icon: ScrollText,
    sections: [
      {
        title: '1. Objet et acceptation',
        body: [
          'The Nuptial Plan fournit un espace numérique permettant de préparer, organiser et suivre un projet de mariage. En créant un compte ou en utilisant le service, vous reconnaissez avoir pris connaissance de ces conditions et les accepter.',
          'L’éditeur doit compléter les informations légales, le prix des offres et les modalités de contact avant la publication définitive de ces conditions.',
        ],
      },
      {
        title: '2. Compte et accès',
        body: [
          'Vous devez fournir des informations exactes et maintenir la confidentialité de vos moyens d’accès. Vous êtes responsable des activités réalisées depuis votre compte et devez nous signaler rapidement toute utilisation non autorisée.',
          'L’accès peut être suspendu temporairement pour des raisons de sécurité, de maintenance, de non-respect des présentes conditions ou lorsque la loi l’exige.',
        ],
      },
      {
        title: '3. Utilisation autorisée',
        body: [
          'Vous pouvez utiliser le service pour gérer vos projets de mariage et collaborer avec les personnes autorisées par vos soins. Vous devez disposer des droits nécessaires sur les informations, images et documents que vous importez.',
          'Il est interdit de perturber le fonctionnement du service, de contourner ses mesures de sécurité, d’accéder aux données d’un autre utilisateur, d’utiliser le service à des fins illicites ou d’y importer des contenus portant atteinte aux droits de tiers.',
        ],
      },
      {
        title: '4. Vos contenus',
        body: [
          'Vous restez titulaire des droits sur les contenus que vous saisissez ou importez. Vous nous accordez uniquement les autorisations nécessaires pour héberger, sauvegarder, afficher et traiter ces contenus afin de fournir les fonctionnalités demandées.',
          'Vous êtes responsable de la légalité, de l’exactitude et de la pertinence des contenus ajoutés à votre compte, notamment des informations concernant les invités, prestataires et autres personnes.',
        ],
      },
      {
        title: '5. Disponibilité et limites du service',
        body: [
          'Nous nous efforçons de maintenir The Nuptial Plan disponible et fiable, mais le service peut être interrompu pour maintenance, mise à jour, incident technique ou événement indépendant de notre volonté.',
          'Les calendriers, budgets, recommandations, exports et autres informations affichés sont des outils d’aide à l’organisation. Ils ne remplacent pas les conseils d’un professionnel, un contrat signé ou une vérification humaine avant une décision importante.',
        ],
      },
      {
        title: '6. Propriété intellectuelle',
        body: [
          'The Nuptial Plan, son identité visuelle, ses logiciels, ses textes, ses interfaces et ses éléments graphiques sont protégés par les droits applicables. Sauf autorisation écrite, vous ne pouvez pas les copier, revendre, adapter ou exploiter en dehors de l’utilisation normale du service.',
        ],
      },
      {
        title: '7. Résiliation et suppression',
        body: [
          'Vous pouvez cesser d’utiliser le service et demander la suppression de votre compte selon les fonctionnalités disponibles ou en contactant l’éditeur. Nous pouvons résilier ou suspendre un compte en cas de violation grave ou répétée des présentes conditions.',
          'La résiliation ne supprime pas automatiquement les obligations qui, par leur nature, doivent continuer à s’appliquer après la fin de l’utilisation du service.',
        ],
      },
      {
        title: '8. Droit applicable et contact',
        body: [
          'Les présentes conditions sont régies par le droit à préciser par l’éditeur, sous réserve des dispositions impératives applicables au lieu de résidence de l’utilisateur.',
          'Toute question concernant ces conditions doit être adressée au contact juridique de l’éditeur, à compléter avant publication.',
        ],
      },
    ],
  },
};

export function LegalPage({ document }: { document: LegalDocument }) {
  const { language, formatDate } = useLanguage();
  const content = language === 'fr' ? documents[document] : {
    privacy: {
      eyebrow: 'Your data, handled with care', title: 'Privacy policy', icon: ShieldCheck,
      intro: 'This policy explains which data The Nuptial Plan processes, why it is used, and what your rights are.',
      sections: [
        { title: '1. Who are we?', body: ['The Nuptial Plan is a wedding-planning tool for planners and the teams supporting them. This policy applies to data processed when you use the application, website, and related services.', 'The publisher must complete its name, address, and contact details before the service is finally published.'] },
        { title: '2. Data we may process', body: ['We may process information needed to create and manage your account: name, email address, profile photo, account identifier, and sign-in information managed by our authentication provider.', 'We may also process the information entered in your wedding files: the couple’s names, wedding date and venue, guests, suppliers, contracts, payments, events, notes, and uploaded documents.', 'Technical data needed to operate and secure the service may also be recorded, such as connection logs, device type, browser, and diagnostic information.'] },
        { title: '3. Why do we use your data?', body: ['Your data is used to provide The Nuptial Plan features, save your changes, display dashboards, secure your account, answer your requests, and improve service reliability.', 'When you use an assistance or content-generation feature, only the information strictly necessary for that feature may be sent to our technical provider. We do not sell your personal data.'] },
        { title: '4. Hosting, security, and retention', body: ['We apply reasonable technical and organisational measures to protect data against unauthorised access, loss, alteration, or disclosure. Access to files is limited to the planner who owns them, in accordance with the application’s security rules.', 'Data is kept for the time needed to provide the service, manage the account, and meet legal obligations. When you request deletion of a file or your account, data is deleted or anonymised within applicable time limits, subject to retention obligations.'] },
        { title: '5. Your rights', body: ['Depending on your place of residence and applicable law, you may request access to, rectification, deletion, restriction, or portability of your data, or object to certain processing.', 'To exercise your rights, contact the publisher at the data-protection email address, which must be added here before publication. You may also lodge a complaint with the competent data-protection authority.'] },
        { title: '6. Cookies and similar technologies', body: ['The site may use cookies or similar technologies necessary for authentication, security, session maintenance, and operating preferences. Analytics or marketing tools may only be enabled with the consents required by applicable law.'] },
        { title: '7. Updating this policy', body: ['We may update this policy to reflect changes to the service or regulations. The date of the latest update is shown below. We will notify you appropriately of any significant change.'] },
      ],
    },
    policy: {
      eyebrow: 'The service framework', title: 'Terms of use', icon: ScrollText,
      intro: 'These terms define the rules for accessing and using The Nuptial Plan.',
      sections: [
        { title: '1. Purpose and acceptance', body: ['The Nuptial Plan provides a digital workspace to prepare, organise, and track a wedding project. By creating an account or using the service, you acknowledge that you have read and accepted these terms.', 'The publisher must complete its legal information, offer prices, and contact arrangements before these terms are finally published.'] },
        { title: '2. Account and access', body: ['You must provide accurate information and keep your access credentials confidential. You are responsible for activity from your account and must promptly notify us of any unauthorised use.', 'Access may be temporarily suspended for security, maintenance, breach of these terms, or where required by law.'] },
        { title: '3. Permitted use', body: ['You may use the service to manage wedding projects and collaborate with people you authorise. You must have the rights needed for information, images, and documents you upload.', 'You may not disrupt the service, bypass security measures, access another user’s data, use the service unlawfully, or upload content that infringes third-party rights.'] },
        { title: '4. Your content', body: ['You retain rights to content you enter or upload. You grant us only the permissions needed to host, back up, display, and process it in order to provide requested features.', 'You are responsible for the legality, accuracy, and relevance of content added to your account, including information about guests, suppliers, and other people.'] },
        { title: '5. Availability and service limits', body: ['We aim to keep The Nuptial Plan available and reliable, but the service may be interrupted for maintenance, updates, technical incidents, or events beyond our control.', 'Calendars, budgets, recommendations, exports, and other displayed information are organisational aids. They do not replace professional advice, a signed contract, or human review before an important decision.'] },
        { title: '6. Intellectual property', body: ['The Nuptial Plan, its visual identity, software, text, interfaces, and graphic elements are protected by applicable rights. Unless authorised in writing, you may not copy, resell, adapt, or exploit them outside normal use of the service.'] },
        { title: '7. Termination and deletion', body: ['You may stop using the service and request deletion of your account through available features or by contacting the publisher. We may terminate or suspend an account for a serious or repeated breach of these terms.', 'Termination does not automatically remove obligations that, by their nature, must continue after use of the service ends.'] },
        { title: '8. Governing law and contact', body: ['These terms are governed by the law to be specified by the publisher, subject to mandatory provisions applicable where the user resides.', 'Questions about these terms should be sent to the publisher’s legal contact, to be completed before publication.'] },
      ],
    },
  }[document];
  const Icon = content.icon;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#F8F3EE] text-[#1A091A]">
      <header className="border-b border-[#D7CDD7]/70 bg-[#FDF9FD]/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3 text-[#3C1A3C]">
            <img src="/tnp-gold-logo.png" alt="" className="h-10 w-10 object-contain" />
            <span className="hidden font-serif text-xl sm:block">The Nuptial Plan</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-[#5D2D5D] hover:text-[#3C1A3C]">
            <ArrowLeft size={14} /> {language === 'fr' ? 'Retour à l’accueil' : 'Back to home'}
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full flex-1 max-w-3xl flex-col px-5 py-12 sm:px-8 sm:py-16">
        <div className="mb-10 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5D2D5D]/10 text-[#5D2D5D]">
            <Icon size={24} />
          </span>
          <p className="eyebrow mb-2 text-[#A8893E]">{content.eyebrow}</p>
          <h1 className="font-serif text-4xl leading-tight text-[#3C1A3C] sm:text-5xl">{content.title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#716471]">{content.intro}</p>
           <p className="mt-3 text-[11px] text-[#9B7E9B]">{language === 'fr' ? 'Dernière mise à jour' : 'Last updated'}: {formatDate('2026-08-08', { dateStyle: 'long' })}</p>
        </div>

        <article className="rounded-3xl border border-[#D7CDD7]/70 bg-[#FDF9FD] p-6 shadow-[0_12px_40px_rgba(93,45,93,0.08)] sm:p-10">
          <div className="space-y-8">
            {content.sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-serif text-2xl text-[#3C1A3C]">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-[#4E414E]">
                  {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </section>
            ))}
          </div>
        </article>

        <LegalFooter className="mt-auto pt-8" />
      </main>
    </div>
  );
}

export function PrivacyPage() {
  return <LegalPage document="privacy" />;
}

export function PolicyPage() {
  return <LegalPage document="policy" />;
}