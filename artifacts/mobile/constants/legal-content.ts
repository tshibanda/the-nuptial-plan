import type { AppLanguage } from '@/context/LocalizationContext';

export type LegalDocumentKey = 'privacy' | 'policy';

export type LegalDocument = {
  eyebrow: string;
  title: string;
  intro: string;
  icon: 'shield' | 'file-text';
  sections: Array<{ title: string; body: string[] }>;
};

export const LEGAL_DOCUMENTS: Record<AppLanguage, Record<LegalDocumentKey, LegalDocument>> = {
  fr: {
    privacy: {
      eyebrow: 'Vos données, avec soin',
      title: 'Politique de confidentialité',
      intro: 'Cette politique explique quelles données The Nuptial Plan traite, pourquoi elles sont utilisées et quels sont vos droits.',
      icon: 'shield',
      sections: [
        { title: '1. Qui sommes-nous ?', body: [
          'The Nuptial Plan est un outil de planification de mariage destiné aux planners et aux équipes qui les accompagnent. Cette politique s’applique aux données traitées lorsque vous utilisez l’application, le site et les services associés.',
          'Les mentions relatives à l’éditeur, à son adresse et à son contact doivent être complétées par l’éditeur du service avant toute mise en ligne définitive.',
        ] },
        { title: '2. Données que nous pouvons traiter', body: [
          'Nous pouvons traiter les informations nécessaires à la création et à la gestion de votre compte : nom, adresse e-mail, photo de profil, identifiant de compte et informations de connexion gérées par notre fournisseur d’authentification.',
          'Nous pouvons également traiter les informations que vous saisissez dans vos dossiers de mariage : noms des mariés, date et lieu du mariage, invités, prestataires, contrats, paiements, événements, notes et documents importés.',
          'Les données techniques nécessaires au fonctionnement et à la sécurité du service peuvent également être enregistrées, comme les journaux de connexion, le type d’appareil et les informations de diagnostic.',
        ] },
        { title: '3. Pourquoi utilisons-nous vos données ?', body: [
          'Vos données sont utilisées pour fournir les fonctionnalités de The Nuptial Plan, enregistrer vos modifications, afficher vos tableaux de bord, sécuriser votre compte, répondre à vos demandes et améliorer la fiabilité du service.',
          'Lorsque vous utilisez une fonctionnalité d’assistance ou de génération de contenu, les informations strictement nécessaires peuvent être transmises à notre prestataire technique. Nous ne vendons pas vos données personnelles.',
        ] },
        { title: '4. Hébergement, sécurité et conservation', body: [
          'Nous appliquons des mesures techniques et organisationnelles raisonnables pour protéger les données contre l’accès non autorisé, la perte, l’altération ou la divulgation. L’accès aux dossiers est limité au planner auquel ils appartiennent.',
          'Les données sont conservées pendant la durée nécessaire à la fourniture du service, à la gestion du compte et au respect des obligations légales. Lorsque vous demandez la suppression d’un dossier ou de votre compte, les données sont supprimées ou anonymisées dans les délais applicables.',
        ] },
        { title: '5. Vos droits', body: [
          'Selon votre lieu de résidence et la réglementation applicable, vous pouvez demander l’accès, la rectification, la suppression, la limitation ou la portabilité de vos données, ou vous opposer à certains traitements.',
          'Pour exercer vos droits, contactez l’éditeur à l’adresse e-mail dédiée à la protection des données, qui doit être ajoutée avant publication. Vous pouvez également introduire une réclamation auprès de l’autorité compétente.',
        ] },
        { title: '6. Cookies et technologies similaires', body: [
          'Le site peut utiliser des cookies ou technologies similaires nécessaires à l’authentification, à la sécurité, au maintien de session et aux préférences de fonctionnement. Les outils de mesure d’audience ou de marketing ne doivent être activés qu’avec les consentements requis.',
        ] },
        { title: '7. Mise à jour de cette politique', body: [
          'Nous pouvons mettre à jour cette politique pour tenir compte de l’évolution du service ou de la réglementation. En cas de changement important, nous vous en informerons par un moyen approprié.',
        ] },
      ],
    },
    policy: {
      eyebrow: 'Le cadre du service',
      title: 'Conditions générales d’utilisation',
      intro: 'Ces conditions définissent les règles d’accès et d’utilisation de The Nuptial Plan.',
      icon: 'file-text',
      sections: [
        { title: '1. Objet et acceptation', body: [
          'The Nuptial Plan fournit un espace numérique permettant de préparer, organiser et suivre un projet de mariage. En créant un compte ou en utilisant le service, vous reconnaissez avoir pris connaissance de ces conditions et les accepter.',
          'Les prix, périodes d’abonnement, conditions de renouvellement et éventuelles périodes d’essai applicables sont présentés avant la confirmation de tout achat.',
        ] },
        { title: '2. Compte et accès', body: [
          'Vous devez fournir des informations exactes et maintenir la confidentialité de vos moyens d’accès. Vous êtes responsable des activités réalisées depuis votre compte et devez nous signaler rapidement toute utilisation non autorisée.',
          'L’accès peut être suspendu temporairement pour des raisons de sécurité, de maintenance, de non-respect des présentes conditions ou lorsque la loi l’exige.',
        ] },
        { title: '3. Utilisation autorisée', body: [
          'Vous pouvez utiliser le service pour gérer vos projets de mariage et collaborer avec les personnes autorisées par vos soins. Vous devez disposer des droits nécessaires sur les informations, images et documents que vous importez.',
          'Il est interdit de perturber le fonctionnement du service, de contourner ses mesures de sécurité, d’accéder aux données d’un autre utilisateur, d’utiliser le service à des fins illicites ou d’importer des contenus portant atteinte aux droits de tiers.',
        ] },
        { title: '4. Vos contenus', body: [
          'Vous restez titulaire des droits sur les contenus que vous saisissez ou importez. Vous nous accordez uniquement les autorisations nécessaires pour héberger, sauvegarder, afficher et traiter ces contenus afin de fournir les fonctionnalités demandées.',
          'Vous êtes responsable de la légalité, de l’exactitude et de la pertinence des contenus ajoutés à votre compte, notamment des informations concernant les invités et prestataires.',
        ] },
        { title: '5. Disponibilité et limites du service', body: [
          'Nous nous efforçons de maintenir The Nuptial Plan disponible et fiable, mais le service peut être interrompu pour maintenance, mise à jour, incident technique ou événement indépendant de notre volonté.',
          'Les calendriers, budgets, recommandations, exports et autres informations affichés sont des outils d’aide à l’organisation. Ils ne remplacent pas les conseils d’un professionnel, un contrat signé ou une vérification humaine.',
        ] },
        { title: '6. Propriété intellectuelle', body: [
          'The Nuptial Plan, son identité visuelle, ses logiciels, ses textes, ses interfaces et ses éléments graphiques sont protégés par les droits applicables. Sauf autorisation écrite, vous ne pouvez pas les copier, revendre, adapter ou exploiter en dehors de l’utilisation normale du service.',
        ] },
        { title: '7. Abonnements et renouvellement', body: [
          'Les abonnements Premium achetés dans l’application sont des abonnements à renouvellement automatique. Le paiement est débité de votre compte Apple à la confirmation de l’achat, puis renouvelé automatiquement sauf résiliation au moins 24 heures avant la fin de la période en cours.',
          'Vous pouvez gérer ou résilier votre abonnement depuis les réglages de votre compte Apple. Les montants affichés dans l’application sont ceux fournis par l’App Store dans la devise de votre boutique.',
          'Pour les abonnements iOS, le contrat de licence utilisateur final standard d’Apple (« Apple Standard EULA ») s’applique également.',
        ] },
        { title: '8. Résiliation et suppression', body: [
          'Vous pouvez supprimer votre compte directement depuis Profil > Supprimer le compte. Cette action efface définitivement les données de votre compte conformément à notre politique de confidentialité.',
          'La résiliation ne supprime pas automatiquement les obligations qui, par leur nature, doivent continuer à s’appliquer après la fin de l’utilisation du service.',
        ] },
        { title: '9. Droit applicable et contact', body: [
          'Les présentes conditions s’appliquent sous réserve des dispositions impératives de protection des consommateurs applicables dans votre pays de résidence.',
          'Toute question concernant ces conditions peut être adressée à contact@thenuptialplan.com.',
        ] },
      ],
    },
  },
  en: {
    privacy: {
      eyebrow: 'Your data, handled with care',
      title: 'Privacy Policy',
      intro: 'This policy explains what data The Nuptial Plan processes, why it is used, and what your rights are.',
      icon: 'shield',
      sections: [
        { title: '1. Who are we?', body: [
          'The Nuptial Plan is a wedding planning tool for planners and the teams that support them. This policy applies to data processed when you use the application, website, and related services.',
          'Information about the publisher, its address, and its contact details must be completed by the service publisher before final publication.',
        ] },
        { title: '2. Data we may process', body: [
          'We may process the information needed to create and manage your account: name, email address, profile photo, account identifier, and sign-in information managed by our authentication provider.',
          'We may also process the information you enter in your wedding files: the couple’s names, wedding date and venue, guests, vendors, contracts, payments, events, notes, and uploaded documents.',
          'Technical data needed to operate and secure the service may also be recorded, such as connection logs, device type, and diagnostic information.',
        ] },
        { title: '3. Why do we use your data?', body: [
          'Your data is used to provide The Nuptial Plan’s features, save your changes, display your dashboards, secure your account, respond to your requests, and improve the reliability of the service.',
          'When you use an assistance or content-generation feature, strictly necessary information may be shared with our technical provider. We do not sell your personal data.',
        ] },
        { title: '4. Hosting, security, and retention', body: [
          'We apply reasonable technical and organisational measures to protect data against unauthorised access, loss, alteration, or disclosure. Access to files is limited to the planner to whom they belong.',
          'Data is retained for the period necessary to provide the service, manage the account, and comply with legal obligations. When you request deletion of a file or your account, the data is deleted or anonymised within the applicable time limits.',
        ] },
        { title: '5. Your rights', body: [
          'Depending on where you live and the applicable regulations, you may request access to, correction, deletion, restriction, or portability of your data, or object to certain processing activities.',
          'To exercise your rights, contact the publisher at the email address dedicated to data protection, which must be added before publication. You may also lodge a complaint with the competent authority.',
        ] },
        { title: '6. Cookies and similar technologies', body: [
          'The website may use cookies or similar technologies necessary for authentication, security, session maintenance, and operational preferences. Analytics or marketing tools may only be activated with the required consents.',
        ] },
        { title: '7. Updates to this policy', body: [
          'We may update this policy to reflect changes to the service or regulations. In the event of a significant change, we will inform you by an appropriate means.',
        ] },
      ],
    },
    policy: {
      eyebrow: 'The service framework',
      title: 'Terms of Use',
      intro: 'These terms define the rules for accessing and using The Nuptial Plan.',
      icon: 'file-text',
      sections: [
        { title: '1. Purpose and acceptance', body: [
          'The Nuptial Plan provides a digital space to prepare, organise, and track a wedding project. By creating an account or using the service, you acknowledge that you have read and accepted these terms.',
          'Applicable prices, subscription periods, renewal terms, and any trial periods are presented before any purchase is confirmed.',
        ] },
        { title: '2. Account and access', body: [
          'You must provide accurate information and keep your access credentials confidential. You are responsible for activities performed through your account and must promptly notify us of any unauthorised use.',
          'Access may be temporarily suspended for security, maintenance, non-compliance with these terms, or where required by law.',
        ] },
        { title: '3. Permitted use', body: [
          'You may use the service to manage your wedding projects and collaborate with people you authorise. You must hold the necessary rights to the information, images, and documents you upload.',
          'You may not disrupt the operation of the service, circumvent its security measures, access another user’s data, use the service for unlawful purposes, or upload content that infringes third-party rights.',
        ] },
        { title: '4. Your content', body: [
          'You retain ownership of the rights in the content you enter or upload. You grant us only the permissions necessary to host, back up, display, and process that content in order to provide the requested features.',
          'You are responsible for the lawfulness, accuracy, and relevance of the content added to your account, including information about guests and vendors.',
        ] },
        { title: '5. Service availability and limitations', body: [
          'We strive to keep The Nuptial Plan available and reliable, but the service may be interrupted for maintenance, updates, technical incidents, or events beyond our control.',
          'Calendars, budgets, recommendations, exports, and other displayed information are organisational aids. They do not replace professional advice, a signed contract, or human review.',
        ] },
        { title: '6. Intellectual property', body: [
          'The Nuptial Plan, its visual identity, software, text, interfaces, and graphic elements are protected by applicable rights. Unless we give written permission, you may not copy, resell, adapt, or exploit them outside normal use of the service.',
        ] },
        { title: '7. Subscriptions and renewal', body: [
          'Premium subscriptions purchased in the application are automatically renewing subscriptions. Payment is charged to your Apple account upon purchase confirmation and automatically renews unless cancelled at least 24 hours before the end of the current period.',
          'You can manage or cancel your subscription in your Apple account settings. Amounts shown in the application are those provided by the App Store in your store’s currency.',
          'For iOS subscriptions, Apple’s Standard End User License Agreement (“Apple Standard EULA”) also applies.',
        ] },
        { title: '8. Termination and deletion', body: [
          'You can delete your account directly from Profile > Delete account. This action permanently erases your account data in accordance with our Privacy Policy.',
          'Termination does not automatically remove obligations which, by their nature, must continue to apply after you stop using the service.',
        ] },
        { title: '9. Governing law and contact', body: [
          'These terms apply subject to mandatory consumer-protection provisions applicable in your country of residence.',
          'Any question about these terms may be sent to contact@thenuptialplan.com.',
        ] },
      ],
    },
  },
};