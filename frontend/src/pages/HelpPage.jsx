import React, { useState, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { 
  BookOpen, 
  Users, 
  Layers, 
  Wallet, 
  CalendarDays, 
  ArrowLeftRight, 
  Sparkles, 
  Settings, 
  GraduationCap, 
  Search, 
  HelpCircle, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle2, 
  ShieldCheck, 
  Smartphone, 
  FileText, 
  AlertCircle, 
  Printer, 
  UserCheck, 
  Award, 
  Clock, 
  Sparkle,
  ExternalLink,
  Info,
  ShoppingBag,
  Baby,
  Image as ImageIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HelpPage() {
  const { t, isRtl, lang } = useLanguage();
  const { settings } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedSection, setExpandedSection] = useState(null);

  // Multilingual guide topics data
  const guideData = useMemo(() => {
    if (lang === 'fr') {
      return [
        {
          id: 'getting_started',
          category: 'start',
          image: '/guide/qafgo_guide_auth.jpg',
          imageCaption: 'Écran d’authentification et enregistrement du poste de travail (Device Key)',
          icon: Sparkles,
          color: 'from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
          title: 'Guide de démarrage rapide',
          summary: 'Première connexion, enregistrement de l’appareil et choix de l’année scolaire.',
          steps: [
            {
              title: '1. Authentification & Sécurité',
              desc: 'Connectez-vous avec vos identifiants fournis par l’administrateur. Chaque utilisateur possède un rôle (ADMIN ou STAFF) avec des permissions strictes sur les données et la politique de genre.'
            },
            {
              title: '2. Enregistrement du Poste de Travail (Device Key)',
              desc: 'Lors de la première utilisation sur un nouvel ordinateur, une boîte de dialogue obligatoire s’affiche. Donnez un nom clair au poste (ex: Bureau Accueil 1). Cela garantit un journal d’audit fiable pour chaque action effectuée.'
            },
            {
              title: '3. Sélection de l’Année Scolaire Active',
              desc: 'Toutes les inscriptions, groupes, présences et cotisations sont rattachés à une année scolaire. Sélectionnez l’année en cours dans la barre supérieure pour manipuler les données correspondantes.'
            }
          ],
          tips: [
            'Vous pouvez personnaliser le thème de couleur et la langue (Arabe, Français, Anglais) depuis la barre supérieure.',
            'En cas d’erreur de mot de passe, contactez l’administrateur pour réinitialiser le compte.'
          ],
          actionLink: '/',
          actionLabel: 'Aller au Tableau de Bord'
        },
        {
          id: 'tracks_groups',
          category: 'academic',
          image: '/guide/qafgo_guide_groups.jpg',
          imageCaption: 'Gestion des filières, groupes et politique de séparation des genres',
          icon: Layers,
          color: 'from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          title: 'Filières, Groupes & Politique de Genre',
          summary: 'Création et gestion des groupes coraniques, préscolaires et de soutien scolaire.',
          steps: [
            {
              title: '1. Les Trois Filières Éducatives',
              desc: 'QafGo prend en charge 3 filières activables dans les paramètres : Enseignement Coranique (Halaqat), Préscolaire (Éveil/Maternelle), et Cours de Soutien Scolaire.'
            },
            {
              title: '2. Création et Paramétrage d’un Groupe',
              desc: 'Dans l’écran Filières & Groupes, cliquez sur "Nouveau Groupe". Renseignez le nom, la capacité max, les frais d’inscription et le tarif mensuel. Si la séparation des genres est activée, choisissez le genre du groupe (Garçons ou Filles).'
            },
            {
              title: '3. Cycle de Vie du Groupe',
              desc: 'Un groupe passe par plusieurs états : En attente (création), Actif (cours en cours), Suspendu (vacances ou arrêt temporaire) ou Archivé (fin de cycle).'
            }
          ],
          tips: [
            'La politique de séparation des genres (Mixte vs Séparé) s’active dans Paramètres Généraux.',
            'Un badge visuel bleu (Garçons) ou rose (Filles) indique la restriction de genre sur les groupes.'
          ],
          actionLink: '/tracks',
          actionLabel: 'Gérer les Groupes'
        },
        {
          id: 'group_operations',
          category: 'academic',
          image: '/guide/qafgo_guide_attendance.jpg',
          imageCaption: 'Gestion de l’assiduité quotidienne et des évaluations régulières',
          icon: UserCheck,
          color: 'from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
          title: 'Opérations Quotidiennes du Groupe',
          summary: 'Appel des présences, évaluations régulières, encaissement direct et impression des listes.',
          steps: [
            {
              title: '1. Gestion de la Présence (Élèves & Enseignants)',
              desc: 'Depuis la page de détail d’un groupe, accédez à l’onglet Présence. Marquez chaque élève : Présent, Absent non justifié, Absent justifié, ou En retard. Vous pouvez aussi marquer la présence du cheikh ou enregistrer un enseignant remplaçant.'
            },
            {
              title: '2. Évaluations Spécialisées par Filière',
              desc: 'Coran : Suivi des Ahzab mémorisés, révision, récitation. Préscolaire : Compétences comportementales, motrices et mémorisation. Soutien : Notes d’examens et devoirs continus.'
            },
            {
              title: '3. Encaissement Direct & Impression',
              desc: 'Enregistrez le paiement des mensualités directement depuis la liste des élèves avec impression automatique du reçu thermique ou standard. Imprimez la liste d’émargement officielle en un clic.'
            },
            {
              title: '4. Badges Préscolaires & Prérequis de Séance',
              desc: 'Pour les groupes préscolaires, imprimez des badges d’identification pour les enfants (8 badges par feuille A4 avec lignes de découpe) avec photo et contact d’urgence. L’accès à la grille de notation (Scoring Sheet) exige qu’une séance soit créée.'
            }
          ],
          tips: [
            'L’historique complet des présences reste consultable par date et exportable.',
            'La modification de la présence est protégée si la date est verrouillée.'
          ],
          actionLink: '/tracks',
          actionLabel: 'Accéder aux Groupes'
        },
        {
          id: 'students_dossier',
          category: 'students',
          icon: Users,
          color: 'from-indigo-500/20 to-blue-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
          title: 'Dossier Scolaire & Inscriptions',
          summary: 'Enregistrement complet de l’élève, vérification du genre, exonérations et dossier permanent.',
          steps: [
            {
              title: '1. Inscription d’un Nouvel Élève',
              desc: 'Renseignez le nom, prénom, date de naissance, genre, et coordonnées des tuteurs. Si le système sépare les genres, le sélecteur de groupes n’affiche que les groupes correspondant au sexe de l’enfant.'
            },
            {
              title: '2. Réductions et Exonérations Fratrie',
              desc: 'Appliquez un pourcentage de réduction (ex: 20% pour le 2ème enfant) ou une exonération totale (100%) pour les orphelins ou cas sociaux.'
            },
            {
              title: '3. Dossier Permanent à Vie & Historique des Dettes',
              desc: 'Chaque élève dispose d’un profil unique conservant son historique : groupes fréquentés, progression, badges, reçus, ainsi que le grand livre complet de ses dettes et achats de fournitures.'
            }
          ],
          tips: [
            'Le filtre par genre dans la liste des élèves respecte vos permissions d’accès utilisateur.',
            'Vous pouvez imprimer la fiche d’inscription individuelle ou la carte d’élève.'
          ],
          actionLink: '/students',
          actionLabel: 'Voir les Élèves'
        },
        {
          id: 'transfers_guide',
          category: 'students',
          icon: ArrowLeftRight,
          color: 'from-violet-500/20 to-purple-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30',
          title: 'Transferts Inter-Groupes',
          summary: 'Changement de groupe sécurisé avec validation du genre et conservation de l’historique.',
          steps: [
            {
              title: '1. Déclencher un Transfert',
              desc: 'Depuis la liste des élèves ou le détail du groupe, cliquez sur l’icône de transfert. Choisissez le groupe de destination et indiquez le motif (ex: changement d’horaire).'
            },
            {
              title: '2. Contrôle Atomique de Cohérence',
              desc: 'Le système vérifie que le groupe d’accueil dispose de places disponibles et que la politique de genre est scrupuleusement respectée (un garçon ne peut être muté dans un groupe de filles).'
            },
            {
              title: '3. Journal des Mouvements',
              desc: 'Toutes les mutations sont consignées avec la date, l’auteur de l’opération et l’ancien groupe dans le Registre des Transferts.'
            }
          ],
          tips: [
            'L’historique financier et les reçus déjà émis restent fidèlement attachés à l’élève après le transfert.'
          ],
          actionLink: '/transfers',
          actionLabel: 'Consulter le Journal'
        },
        {
          id: 'timetable_rooms',
          category: 'academic',
          image: '/guide/qafgo_guide_attendance.jpg',
          imageCaption: 'Emploi du temps hebdomadaire et détection des conflits de salles',
          icon: CalendarDays,
          color: 'from-sky-500/20 to-blue-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30',
          title: 'Emploi du Temps, Salles & Enseignants',
          summary: 'Attribution des salles de classe, planning hebdomadaire et détection des conflits.',
          steps: [
            {
              title: '1. Enregistrement des Salles et Enseignants',
              desc: 'Définissez la liste des salles avec leur capacité. Enregistrez les enseignants et cheikhs avec leurs spécialités et coordonnées.'
            },
            {
              title: '2. Création des Séances Hebdomadaires',
              desc: 'Sur la grille de l’emploi du temps, assignez les séances par créneau horaire, groupe, enseignant et salle.'
            },
            {
              title: '3. Détection Automatique des Conflits',
              desc: 'Le système vous alerte immédiatement si un enseignant ou une salle est programmé sur deux séances simultanées.'
            }
          ],
          tips: [
            'L’emploi du temps est imprimable par salle, par groupe ou pour l’établissement complet.'
          ],
          actionLink: '/timetable',
          actionLabel: 'Voir le Planning'
        },
        {
          id: 'store_products',
          category: 'store',
          icon: ShoppingBag,
          color: 'from-amber-500/20 to-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30',
          title: 'Boutique, Ventes & Gestion des Dettes',
          summary: 'Gestion des stocks d’articles, vente aux élèves, paiement différé (crédit) et historique des dettes.',
          steps: [
            {
              title: '1. Gestion du Stock & Prix',
              desc: 'Enregistrez les manuels, corans, et fournitures scolaires avec désignation, quantité en stock, prix d’achat et prix de vente pour les élèves.'
            },
            {
              title: '2. Vente Directe & Dettes Élèves',
              desc: 'Vendez des articles aux élèves avec règlement complet, acompte partiel ou dette intégrale. Le montant impayé est automatiquement reporté sur le dossier financier de l’élève.'
            },
            {
              title: '3. Encaissement des Dettes & Reçus Dédiés',
              desc: 'Recevez les règlements échelonnés des dettes avec génération automatique d’un reçu de vente certifié et traçabilité complète dans le profil de l’élève.'
            }
          ],
          tips: [
            'Toutes les rentrées financières de la boutique sont consolidées dans les revenus globaux de la section Finances.',
            'L’impression des reçus de vente est parfaitement isolée sans éléments superflus de l’écran.'
          ],
          actionLink: '/products',
          actionLabel: 'Gérer la Boutique'
        },
        {
          id: 'finance_receipts',
          category: 'finance',
          image: '/guide/qafgo_guide_finance.jpg',
          imageCaption: 'Gestion financière, suivi des cotisations et reçus officiels',
          icon: Wallet,
          color: 'from-emerald-500/20 to-green-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          title: 'Gestion Financière & Reçus',
          summary: 'Suivi des mensualités, gestion des impayés, reçus officiels et registre des dépenses.',
          steps: [
            {
              title: '1. Encaissement des Mensualités',
              desc: 'Sélectionnez l’élève, le mois concerné, le montant reçu (possibilité de paiement partiel ou avance) et le mode de règlement (Espèces, Virement).'
            },
            {
              title: '2. Impression Immédiate du Reçu',
              desc: 'Chaque paiement génère un reçu officiel avec numéro de série unique, montant en chiffres et lettres, tampon et signature de l’école.'
            },
            {
              title: '3. Revenus Consolidés & Ventes Boutique',
              desc: 'Le tableau de bord financier consolide les cotisations d’inscription et les recettes de vente des produits avec un onglet dédié "Ventes de Produits" pour un audit limpide.'
            }
          ],
          tips: [
            'Les élèves bénéficiant d’une exonération à 100% sont automatiquement indiqués comme régularisés.',
            'L’impression thermique 80mm et A4 est optimisée sans polluer le document avec l’interface applicative.'
          ],
          actionLink: '/finance',
          actionLabel: 'Accéder aux Finances'
        },
        {
          id: 'rollover_guide',
          category: 'system',
          icon: Sparkles,
          color: 'from-fuchsia-500/20 to-purple-500/20 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30',
          title: 'Passation & Clôture Annuelle',
          summary: 'Transition sécurisée vers une nouvelle année scolaire et clonage des groupes.',
          steps: [
            {
              title: '1. Création de la Nouvelle Année Scolaire',
              desc: 'Définissez l’intitulé de la nouvelle année (ex: 2026-2027) et ses dates de début et de fin.'
            },
            {
              title: '2. Clonage des Structures & Réinscriptions',
              desc: 'Dupliquez la structure des groupes et réinscrivez sélectivement les élèves actifs en quelques clics.'
            },
            {
              title: '3. Verrouillage de l’Année Précédente',
              desc: 'Verrouillez l’ancienne année pour figer les comptes financiers et les résultats d’évaluation contre toute modification accidentelle.'
            }
          ],
          tips: [
            'L’historique des années archivées reste consultable en lecture seule à tout moment.'
          ],
          actionLink: '/rollover',
          actionLabel: 'Passation Annuelle'
        },
        {
          id: 'settings_security',
          category: 'system',
          icon: Settings,
          color: 'from-slate-500/20 to-zinc-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30',
          title: 'Paramètres, Utilisateurs & Rôles',
          summary: 'Identité de l’école, tampon officiel, matrice des permissions et filtrage par genre.',
          steps: [
            {
              title: '1. Identité de l’Établissement',
              desc: 'Téléversez le logo et le cachet/tampon officiel de l’école. Définissez l’adresse, le téléphone et la devise monétaire (ex: DZD).'
            },
            {
              title: '2. Gestion des Utilisateurs & Permissions',
              desc: 'Créez les comptes des collaborateurs en leur attribuant des permissions granulaires (Élèves, Finances, Présence, Groupes, Paramètres).'
            },
            {
              title: '3. Accessibilité par Genre (Staff Gender Access)',
              desc: 'Lorsque la séparation des genres est activée, vous pouvez configurer l’accès d’un utilisateur pour qu’il ne voie que les garçons, que les filles, ou tous.'
            }
          ],
          tips: [
            'Toutes les actions sensibles (suppression, modification de droits) sont consignées dans le Journal d’Audit.',
            'L’administrateur a un accès complet sans restriction.'
          ],
          actionLink: '/settings',
          actionLabel: 'Ouvrir les Paramètres'
        }
      ];
    }

    if (lang === 'en') {
      return [
        {
          id: 'getting_started',
          category: 'start',
          image: '/guide/qafgo_guide_auth.jpg',
          imageCaption: 'Authentication screen and workstation device key registration',
          icon: Sparkles,
          color: 'from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
          title: 'Quick Start & Onboarding',
          summary: 'First login, device registration, and selecting the active academic year.',
          steps: [
            {
              title: '1. Authentication & Security',
              desc: 'Sign in with your credentials provided by the administrator. Each user has a role (ADMIN or STAFF) with granular permissions for data and gender accessibility.'
            },
            {
              title: '2. Device / Workstation Registration',
              desc: 'When using a new browser or computer, a mandatory registration modal appears. Give a recognizable name to this workstation (e.g. Reception PC 1) to ensure tamper-proof audit trails.'
            },
            {
              title: '3. Select Active Academic Year',
              desc: 'All student enrollments, groups, attendance, and fee payments belong to an academic year. Switch years seamlessly from the top navigation bar.'
            }
          ],
          tips: [
            'Switch color themes and language (Arabic, French, English) from the top bar.',
            'If you forget your password, ask an administrator to reset your credentials.'
          ],
          actionLink: '/',
          actionLabel: 'Go to Dashboard'
        },
        {
          id: 'tracks_groups',
          category: 'academic',
          image: '/guide/qafgo_guide_groups.jpg',
          imageCaption: 'Educational tracks, groups setup, and gender restriction badges',
          icon: Layers,
          color: 'from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          title: 'Educational Tracks, Groups & Gender Policy',
          summary: 'Creating and managing Quranic Halaqat, Preschool, and Tutoring groups.',
          steps: [
            {
              title: '1. Three Distinct Educational Tracks',
              desc: 'QafGo supports three tracks that can be enabled in Settings: Quran memorization (Halaqat), Preschool/Kindergarten, and Academic Tutoring.'
            },
            {
              title: '2. Group Creation & Gender Policy',
              desc: 'Click "New Group" in Tracks & Groups. Set group name, capacity, and tuition. If Gender Separation is enabled in School Settings, assign the group gender (Male or Female).'
            },
            {
              title: '3. Group Lifecycle Management',
              desc: 'Manage group status across four states: Pending, Active, Suspended, or Archived.'
            }
          ],
          tips: [
            'Gender separation (Mixed vs. Separated) can be toggled in General Settings.',
            'Distinct blue (Boys) and pink (Girls) badges highlight gender restrictions on groups.'
          ],
          actionLink: '/tracks',
          actionLabel: 'Manage Groups'
        },
        {
          id: 'group_operations',
          category: 'academic',
          image: '/guide/qafgo_guide_attendance.jpg',
          imageCaption: 'Daily roll call, student evaluations, and fast tuition collections',
          icon: UserCheck,
          color: 'from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
          title: 'Daily Group Operations',
          summary: 'Attendance recording, specialized evaluations, fast tuition collection, and roster printing.',
          steps: [
            {
              title: '1. Student & Teacher Attendance',
              desc: 'From the group view, open the Attendance tab. Mark students as Present, Absent, Justified, or Late. Record teacher attendance and substitute teachers.'
            },
            {
              title: '2. Track-Specific Evaluations',
              desc: 'Quran: Track memorized Ahzab, revision, and Tajweed. Preschool: Behavioral skills, motor development. Tutoring: Continuous test scores and exams.'
            },
            {
              title: '3. Direct Fee Collection & Printing',
              desc: 'Record student monthly payments directly from the group table and print receipts immediately. Print attendance sign-in sheets in one click.'
            },
            {
              title: '4. Preschool Badges & Session Requirement',
              desc: 'Print official child-friendly ID badges for preschool groups (8 cards per A4 sheet with cut guides) with student photo and guardian emergency contacts. Note that creating an active session is required prior to opening the Scoring Sheet.'
            }
          ],
          tips: [
            'All past attendance logs remain searchable and exportable.',
            'Attendance editing can be locked for past sessions.'
          ],
          actionLink: '/tracks',
          actionLabel: 'Explore Groups'
        },
        {
          id: 'students_dossier',
          category: 'students',
          icon: Users,
          color: 'from-indigo-500/20 to-blue-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
          title: 'Student Dossier & Admissions',
          summary: 'Comprehensive student profile, gender validation, sibling discounts, and lifetime academic file.',
          steps: [
            {
              title: '1. Registering a New Student',
              desc: 'Enter student information, birthdate, gender, and guardian contacts. If gender separation is enabled, the group selector only allows groups matching the student gender.'
            },
            {
              title: '2. Discounts & Full Scholarships',
              desc: 'Configure family discounts (e.g., 20% for 2nd sibling) or full 100% exemptions for orphans or special circumstances.'
            },
            {
              title: '3. Lifetime Dossier & Debts Ledger',
              desc: 'Every student has a permanent portfolio tracking year-over-year groups, Quranic milestones, badges, conduct remarks, receipts, and an itemized store debt ledger.'
            }
          ],
          tips: [
            'Student gender filtering automatically respects your user permission scope.',
            'Generate printable student ID cards and admission forms.'
          ],
          actionLink: '/students',
          actionLabel: 'View Students'
        },
        {
          id: 'transfers_guide',
          category: 'students',
          icon: ArrowLeftRight,
          color: 'from-violet-500/20 to-purple-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30',
          title: 'Inter-Group Transfers',
          summary: 'Atomic group switching with capacity check, gender validation, and full historical log.',
          steps: [
            {
              title: '1. Initiate a Transfer',
              desc: 'Click the transfer button on any enrolled student. Select target group and provide the transfer reason.'
            },
            {
              title: '2. Automatic Validation Rules',
              desc: 'The platform checks target group seat availability and verifies strict gender compatibility before executing.'
            },
            {
              title: '3. Transfer Movement Ledger',
              desc: 'All transfers are logged with timestamp, author, previous group, and reason in the Transfers Journal.'
            }
          ],
          tips: [
            'Payment records and receipts stay intact and correctly linked to the student.'
          ],
          actionLink: '/transfers',
          actionLabel: 'View Transfers'
        },
        {
          id: 'timetable_rooms',
          category: 'academic',
          image: '/guide/qafgo_guide_attendance.jpg',
          imageCaption: 'Weekly timetable scheduling grid and automated conflict detection',
          icon: CalendarDays,
          color: 'from-sky-500/20 to-blue-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30',
          title: 'Timetable, Rooms & Teachers',
          summary: 'Weekly schedule grid, classroom capacity, and automated conflict detection.',
          steps: [
            {
              title: '1. Register Classrooms & Teachers',
              desc: 'Define rooms with maximum capacities. Register teachers with their phone numbers and academic specialties.'
            },
            {
              title: '2. Schedule Weekly Sessions',
              desc: 'Drag or assign sessions to timetable slots by day, group, teacher, and assigned classroom.'
            },
            {
              title: '3. Double-Booking Conflict Prevention',
              desc: 'Real-time warning alerts prevent assigning the same teacher or room to multiple overlapping sessions.'
            }
          ],
          tips: [
            'Print weekly schedules by room, by teacher, or for the whole school.'
          ],
          actionLink: '/timetable',
          actionLabel: 'View Timetable'
        },
        {
          id: 'store_products',
          category: 'store',
          icon: ShoppingBag,
          color: 'from-amber-500/20 to-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30',
          title: 'Store, Products & Student Debt Management',
          summary: 'Inventory control, product sales to students, debt tracking, installments, and unified revenue reporting.',
          steps: [
            {
              title: '1. Inventory & Pricing Catalog',
              desc: 'Add products, books, and school supplies with designation, available quantity, purchase price, and selling price.'
            },
            {
              title: '2. Student Checkout & Debt Logging',
              desc: 'Sell items directly to enrolled students. Choose between full upfront payment, down payment, or adding the remaining balance as student debt.'
            },
            {
              title: '3. Debt Repayment & Official Receipts',
              desc: 'Collect debt installments from the Store or student profile. Generate serialized printable sale receipts with clean print isolation.'
            }
          ],
          tips: [
            'All product revenue is unified with tuition fees in the main Finance dashboard.',
            'A permanent debt ledger is accessible in each student profile.'
          ],
          actionLink: '/products',
          actionLabel: 'Open Store'
        },
        {
          id: 'finance_receipts',
          category: 'finance',
          image: '/guide/qafgo_guide_finance.jpg',
          imageCaption: 'Tuition fees ledger, student debt monitoring, and official receipts',
          icon: Wallet,
          color: 'from-emerald-500/20 to-green-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          title: 'Finance, Tuition & Receipts',
          summary: 'Monthly fee management, overdue tracking, official receipt printing, and expense records.',
          steps: [
            {
              title: '1. Record Monthly Tuition Payment',
              desc: 'Select student, target month, payment amount (full or partial/advance), and method (Cash, Bank Transfer).'
            },
            {
              title: '2. Instant Official Receipt Generation',
              desc: 'Generate branded receipts featuring serial numbers, spelled-out currency amounts, and school stamp.'
            },
            {
              title: '3. Consolidated Revenue & Product Sales Ledger',
              desc: 'Track tuition dues, expenses, and store sales. The Finance dashboard merges tuition collections with product revenues into a unified revenue overview with a dedicated Product Sales tab.'
            }
          ],
          tips: [
            '100% exempted students automatically appear with a cleared scholarship badge.',
            'Support for 80mm thermal receipts and A4/A5 voucher formats with clean print isolation.'
          ],
          actionLink: '/finance',
          actionLabel: 'Open Finance'
        },
        {
          id: 'rollover_guide',
          category: 'system',
          icon: Sparkles,
          color: 'from-fuchsia-500/20 to-purple-500/20 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30',
          title: 'Annual Rollover & Archiving',
          summary: 'Seamless transition to next academic year and group structure duplication.',
          steps: [
            {
              title: '1. Create the Next Academic Year',
              desc: 'Define the upcoming academic year label (e.g. 2026-2027) with start and end dates.'
            },
            {
              title: '2. Clone Groups & Re-enroll Students',
              desc: 'Batch-clone group configurations and selectively re-enroll graduating or advancing students.'
            },
            {
              title: '3. Lock Previous Year Records',
              desc: 'Lock past years to protect financial ledgers and attendance history against accidental modification.'
            }
          ],
          tips: [
            'Archived years remain accessible in read-only mode at any time.'
          ],
          actionLink: '/rollover',
          actionLabel: 'Annual Rollover'
        },
        {
          id: 'settings_security',
          category: 'system',
          icon: Settings,
          color: 'from-slate-500/20 to-zinc-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30',
          title: 'Settings, Permissions & Gender Access',
          summary: 'School branding, official stamp upload, permissions matrix, and gender visibility settings.',
          steps: [
            {
              title: '1. Institution Branding & Stamp',
              desc: 'Upload the school logo and official stamp. Set school name, address, contact numbers, and currency symbol.'
            },
            {
              title: '2. User Accounts & Granular Permissions',
              desc: 'Create staff accounts with customized access rights (Students, Finance, Attendance, Groups, Settings).'
            },
            {
              title: '3. Gender Access Restriction (Policy)',
              desc: 'When gender separation is enabled, configure each user to access only male students/groups, female only, or all.'
            }
          ],
          tips: [
            'All critical operations are permanently recorded in the Audit Logs.',
            'System Administrators maintain unrestricted access.'
          ],
          actionLink: '/settings',
          actionLabel: 'Open Settings'
        }
      ];
    }

    // Default: Arabic
    return [
      {
        id: 'getting_started',
        category: 'start',
        image: '/guide/qafgo_guide_auth.jpg',
        imageCaption: 'واجهة تسجيل الدخول وتسجيل محطة العمل (Device Key)',
        icon: Sparkles,
        color: 'from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
        title: 'البداية السريعة والتهيئة الأولى',
        summary: 'تسجيل الدخول، توثيق محطة العمل، واختيار الموسم الدراسي النشط.',
        steps: [
          {
            title: '1. تسجيل الدخول والأمان',
            desc: 'أدخل بيانات حسابك التي زودتك بها إدارة المؤسسة. لكل مستخدم رتبة وصلاحيات محددة (مدير نظام ADMIN أو موظف STAFF) مع إمكانية تقييد صلاحية الوصول حسب الجنس.'
          },
          {
            title: '2. تسجيل محطة العمل (الجهاز)',
            desc: 'عند فتح المنصة لأول مرة على متصفح أو حاسوب جديد، ستظهر نافذة إلزامية لتسمية محطة العمل (مثل: حاسوب الاستقبال 1 أو مكتب الإدارة). هذا يضمن توثيق العمليات بدقة متناهية في سجل التدقيق.'
          },
          {
            title: '3. اختيار الموسم الدراسي النشط',
            desc: 'ترتبط كل السجلات (الطلبة، الحلقات، الحضور، الاشتراكات) بالموسم الدراسي. يمكنك التبديل بين المواسم من القائمة العلوية بكل سهولة للاطلاع على أرشيف السنوات السابقة أو إدارة الموسم الحالي.'
          }
        ],
        tips: [
          'يمكنك تغيير سمة الألوان (الوضع الليلي والنهاري) ولغة الواجهة (عربية، فرنسية، إنجليزية) من الشريط العلوي.',
          'في حال نسيان كلمة المرور، يرجى مراجعة مسؤول النظام لإعادة ضبطها.'
        ],
        actionLink: '/',
        actionLabel: 'الانتقال إلى لوحة القيادة'
      },
      {
        id: 'tracks_groups',
        category: 'academic',
        image: '/guide/qafgo_guide_groups.jpg',
        imageCaption: 'لوحة إدارة المسارات والأفواج وشارات تمييز الذكور والإناث',
        icon: Layers,
        color: 'from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        title: 'المسارات التعليمية والأفواج وسياسة الجنسين',
        summary: 'إدارة حلقات القرآن الكريم، أقسام التحضيري، وأفواج الدروس التدعيمية مع سياسة الفصل.',
        steps: [
          {
            title: '1. المسارات التعليمية الثلاثة',
            desc: 'تدعم المنصة ثلاثة مسارات تعليمية متكاملة يمكن تفعيلها حسب الحاجة: مسار القرآن الكريم (حلقات التحفيظ والتجويد)، مسار التعليم التحضيري (رياض الأطفال والبراعم)، ومسار الدروس الخصوصية والتدعيم المدرسي.'
          },
          {
            title: '2. إنشاء فوج جديد وسياسة الفصل بين الجنسين',
            desc: 'من شاشة "المسارات والأفواج"، اضغط على "فوج جديد". حدد الاسم، المسار، الطاقة الاستيعابية، ورسوم الاشتراك. إذا تم تفعيل "فصل الجنسين" في الإعدادات، يجب تحديد جنس الفوج (ذكور أو إناث)، ولن يُسمح بتسجيل أو نقل طالب يخالف جنس الفوج.'
          },
          {
            title: '3. دورة حياة الفوج',
            desc: 'يمر الفوج بعدة حالات مرنة: في الانتظار (قيد التشكيل)، نشط (الدروس جارية)، متوقف مؤقتاً (عطلة أو توقف)، أو مؤرشف (منتهي).'
          }
        ],
        tips: [
          'يتم ضبط سياسة الفصل (مختلط أو مفصول) من شاشة إعدادات المؤسسة.',
          'تظهر شارة مميزة زرقاء للذكور ووردية للإناث لتمييز الأفواج المفصولة بنظرة سريعة.'
        ],
        actionLink: '/tracks',
        actionLabel: 'إدارة الأفواج والمسارات'
      },
      {
        id: 'group_operations',
        category: 'academic',
        image: '/guide/qafgo_guide_attendance.jpg',
        imageCaption: 'كشف رصد الحضور اليومي والتقييمات التخصصية للطلبة',
        icon: UserCheck,
        color: 'from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
        title: 'العمليات اليومية داخل الفوج',
        summary: 'تسجيل الحضور والغياب، التقييمات التخصصية، استخلاص الاشتراكات، وطباعة القوائم.',
        steps: [
          {
            title: '1. حضور الطلبة والمشايخ',
            desc: 'من صفحة تفاصيل الفوج، انتقل إلى تبويب "الحضور". يمكنك تسجيل حضور الطلبة (حاضر، غائب غير مبرر، غائب مبرر، متأخر) بضغطة واحدة، بالإضافة إلى إثبات حضور الشيخ أو تعيين أستاذ مستخلف.'
          },
          {
            title: '2. التقييمات حسب المسار التعليمي',
            desc: 'مسار القرآن: تسجيل الأحزاب المحفوظة، الحفظ الجديد، المراجعة، وأحكام التجويد. مسار التحضيري: تقييم المهارات السلوكية والحركية واللغوية. مسار التدعيم: تسجيل درجات الفروض والاختبارات الدورية.'
          },
          {
            title: '3. استخلاص الاشتراكات وطباعة القوائم',
            desc: 'يمكنك تحصيل الرسوم الشهرية مباشرة من قائمة طلبة الفوج مع إمكانية طباعة وصل استلام فوري، أو طباعة ورقة النداء وإشهار القوائم الرسمية.'
          },
          {
            title: '4. طباعة شارات البراعم وشرط إنشاء الحصة',
            desc: 'لأفواج التعليم المبكر والتحضيري، يتيح النظام طباعة شارات تعريفية ملونة للأطفال بحجم قياسي مع خطوط قص (8 شارات بالورقة A4) تتضمن صورة الطفل وهاتف الطوارئ. كما يشترط النظام إنشاء وتأكيد الحصة أولاً قبل فتح شبكة التنقيط والتقييم (Scoring Sheet).'
          }
        ],
        tips: [
          'يحتفظ النظام بسجل الحضور باليوم والساعة ويمكن تصديره أو طباعته في أي وقت.',
          'في حال تم قفل اليوم من الإدارة، لن يتمكن الموظفون من تعديل الحضور لضمان النزاهة.'
        ],
        actionLink: '/tracks',
        actionLabel: 'الدخول إلى الأفواج'
      },
      {
        id: 'students_dossier',
        category: 'students',
        icon: Users,
        color: 'from-indigo-500/20 to-blue-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
        title: 'تسجيل الطلبة والملف الدائم مدى الحياة',
        summary: 'إضافة طالب جديد، التحقق من التوافق، الإعفاءات وتخفيضات الأخوة، وسجل الديون.',
        steps: [
          {
            title: '1. تسجيل طالب جديد',
            desc: 'أدخل بيانات الطالب (الاسم، اللقب، تاريخ الميلاد، الجنس، وبيانات الولي). إذا كانت المؤسسة تفصل الجنسين، فإن قائمة الأفواج المتاحة في الاستمارة ستعرض فقط الأفواج المتوافقة مع جنس الطالب تلقائياً لمنع أي خلط.'
          },
          {
            title: '2. التخفيضات والإعفاءات (المنح)',
            desc: 'يمكن تحديد نسبة تخفيض للأخوة (مثلاً 20% للابن الثاني) أو تفعيل الإعفاء الكامل بنسبة 100% للأيتام وذوي الاحتياجات الخاصة، مما يعفيهم من الاشتراكات تلقائياً في السجلات المالية.'
          },
          {
            title: '3. الملف الدائم وسجل مشتريات وديون الطالب',
            desc: 'يمتلك كل طالب سجلاً تراكمياً محفوظاً عبر كل السنوات الدراسية، يشمل مسيرته التعليمية، تدرج حفظه للقرآن، الأوسمة، الملاحظات السلوكية، الأرشيف المالي، وسجل ديون ومشتريات المنتجات المدرسية.'
          }
        ],
        tips: [
          'يمكن تصفية قائمة الطلبة حسب الجنس، الفوج، أو الحالة، مع احترام صلاحيات حسابك إذا كان مخصصاً لذكور أو إناث فقط.',
          'يمكنك طباعة بطاقة الطالب أو استمارة التسجيل بضغطة زر.'
        ],
        actionLink: '/students',
        actionLabel: 'إدارة الطلبة'
      },
      {
        id: 'transfers_guide',
        category: 'students',
        icon: ArrowLeftRight,
        color: 'from-violet-500/20 to-purple-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30',
        title: 'تحويلات الطلبة بين الأفواج',
        summary: 'التحويل الآمن بين الحلقات، التحقق من الطاقة الاستيعابية والجنس، وسجل التحويلات.',
        steps: [
          {
            title: '1. طلب التحويل',
            desc: 'من قائمة الطلبة أو صفحة الفوج، انقر على أيقونة التحويل بجانب اسم الطالب، ثم اختر الفوج الجديد واكتب سبب التحويل (مثل: تغير التوقيت أو الانتقال لمستوى أعلى).'
          },
          {
            title: '2. فحص التوافق التلقائي',
            desc: 'يقوم النظام فورياً بالتحقق من عدم تجاوز الطاقة الاستيعابية للفوج الجديد، ومطابقة جنس الطالب مع جنس الفوج في حال تفعيل الفصل، ويمنع التحويل في حال عدم التطابق.'
          },
          {
            title: '3. سجل حركة التحويلات',
            desc: 'يتم توثيق كل عملية تحويل في شاشة "التحويلات" باليوم والتاريخ، واسم الفوج السابق والجديد، والمستخدم الذي قام بالعملية، مع الحفاظ على مدفوعات الطالب السابقة سليمة.'
          }
        ],
        tips: [
          'التحويل يتم بطريقة ذرية (Atomic)، فلا يمكن أن يُحذف الطالب من فوجه الأصلي دون أن يُسجل بنجاح في الفوج الجديد.'
        ],
        actionLink: '/transfers',
        actionLabel: 'شاشة التحويلات'
      },
      {
        id: 'timetable_rooms',
        category: 'academic',
        image: '/guide/qafgo_guide_attendance.jpg',
        imageCaption: 'جدول التوقيت الأسبوعي، القاعات، ومنع التعارضات الزمنية',
        icon: CalendarDays,
        color: 'from-sky-500/20 to-blue-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30',
        title: 'القاعات وجدول التوقيت الأسبوعي',
        summary: 'توزيع الحصص على القاعات والأساتذة ومنع التعارضات الزمنية تلقائياً.',
        steps: [
          {
            title: '1. إعداد القاعات والأساتذة',
            desc: 'أدخل قائمة القاعات المتوفرة مع طاقتها القصوى. سجل بيانات المشايخ والأساتذة مع تحديد تخصصاتهم ومساراتهم التعليمية.'
          },
          {
            title: '2. بناء جدول التوقيت الأسبوعي',
            desc: 'حدد أيام الأسبوع والفترات الزمنية، ثم أسند الحصص باختيار الفوج، الأستاذ، والقاعة المخصصة.'
          },
          {
            title: '3. كشف التعارض ومنع التضارب',
            desc: 'ينبهك النظام تلقائياً إذا حاولت برمجة أستاذ أو قاعة في حصتين في نفس التوقيت، مما يمنع الفوضى في توزيع الحجرات.'
          }
        ],
        tips: [
          'يمكنك طباعة الجدول الأسبوعي مفرزاً حسب القاعة أو الأستاذ أو الفوج، وتعليقه في لوحة الإعلانات.'
        ],
        actionLink: '/timetable',
        actionLabel: 'جدول التوقيت'
      },
      {
        id: 'store_products',
        category: 'store',
        icon: ShoppingBag,
        color: 'from-amber-500/20 to-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30',
        title: 'المتجر، المنتجات، المبيعات والديون',
        summary: 'إدارة مخزون الكتب والمستلزمات، البيع المباشر للطلبة، تقسيط الدفعات، ومتابعة الديون.',
        steps: [
          {
            title: '1. إدارة مخزون المنتجات والأسعار',
            desc: 'أدخل الكتب المدرسية، المصاحف الشريفة، واللوازم مع تحديد الكمية المتوفرة، سعر الشراء وسعر البيع للطلبة، مع التحديث الفوري للكميات المتوفرة.'
          },
          {
            title: '2. بيع المنتجات وتسجيل الديون',
            desc: 'يمكن بيع المنتجات للطلبة بمرونة تامة: سداد كلي، دفع جزء من المبلغ، أو تسجيل العملية كدين كامل على ذمة الطالب ليتم احتسابه وإدراجه تلقائياً في حسابه.'
          },
          {
            title: '3. سداد الديون بالأقساط وإصدار الوصولات',
            desc: 'يتيح النظام سداد ديون المنتجات على دفعات من شاشة المتجر أو مباشرة من ملف الطالب (Student Profile)، مع إصدار وصل بيع مالي معتمد برقم تسلسلي وطباعة معزولة.'
          }
        ],
        tips: [
          'يتم دمج مداخيل مبيعات المتجر تلقائياً مع الاشتراكات الدراسية في قسم المالية لتوفير رقم مداخيل موحد وشامل.',
          'يمكن معاينة سجل الديون وتاريخ المعاملات لكل طالب بالكامل في ملفه التراكمي.'
        ],
        actionLink: '/products',
        actionLabel: 'المتجر والمبيعات'
      },
      {
        id: 'finance_receipts',
        category: 'finance',
        image: '/guide/qafgo_guide_finance.jpg',
        imageCaption: 'شاشة تحصيل الاشتراكات والوصولات المالية المعتمدة بالختم الرسمي',
        icon: Wallet,
        color: 'from-emerald-500/20 to-green-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        title: 'الإدارة المالية، الاشتراكات والوصولات',
        summary: 'تسجيل الاشتراكات الشهرية، طباعة الوصولات الرسمية، متابعة المتأخرات والمصاريف.',
        steps: [
          {
            title: '1. دفع الاشتراك الشهري',
            desc: 'اختر الطالب والشهر المعني. يمكنك تحصيل المبلغ كاملاً أو تسجيل دفع جزئي أو دفع مسبق لعدة أشهر، واختيار طريقة الدفع (نقداً أو تحويل).'
          },
          {
            title: '2. طباعة الوصل الرسمي الفوري',
            desc: 'يُولد النظام وصلاً مالياً معتمداً برقم تسلسلي فريد، متضمناً اسم الطالب، الفوج، المبلغ رقماً وكتابة، وشعار وختم المدرسة، مع دعم الطباعة الحرارية (80mm) ونماذج A4/A5.'
          },
          {
            title: '3. توحيد الإيرادات وتبويب مبيعات المتجر',
            desc: 'تعرض لوحة المالية الإيرادات الكلية المجمعة (رسوم الأفواج + مبيعات المنتجات)، مع تبويب مستقل لمبيعات المتجر يوضح المدفوعات والديون والوصولات الصادرة.'
          }
        ],
        tips: [
          'الطلبة المعفون بنسبة 100% يظهرون تلقائياً كمسددين بشارة "إعفاء كلي".',
          'طباعة الوصولات وشارات التلاميذ معزولة تماماً ولا تطبع عناصر واجهة التطبيق.'
        ],
        actionLink: '/finance',
        actionLabel: 'الإدارة المالية'
      },
      {
        id: 'rollover_guide',
        category: 'system',
        icon: Sparkles,
        color: 'from-fuchsia-500/20 to-purple-500/20 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30',
        title: 'الترحيل السنوي وختام الموسم',
        summary: 'إنشاء الموسم الجديد، استنساخ الأفواج، إعادة تسجيل الطلبة وقفل السنة السابقة.',
        steps: [
          {
            title: '1. إنشاء الموسم الدراسي الجديد',
            desc: 'أدخل تسمية الموسم الجديد (مثل: 2026-2027) مع تحديد تواريخ البداية والنهاية.'
          },
          {
            title: '2. ترحيل واستنساخ الأفواج والطلبة',
            desc: 'استنسخ هيكل الأفواج والحلقات إلى الموسم الجديد بنقرة واحدة، مع خيار إعادة تسجيل الطلبة الناجحين أو المستمرين دون الحاجة لإعادة كتابة بياناتهم.'
          },
          {
            title: '3. قفل الموسم المنتهي',
            desc: 'بعد الانتهاء من الترحيل، يمكنك قفل الموسم السابق لمنع التعديل غير المقصود على بيانات الاشتراكات والتقييمات، مع بقاء أرشيفه متاحاً للقراءة في أي وقت.'
          }
        ],
        tips: [
          'عملية الترحيل السنوي آمنة تماماً ولا تحذف أي بيانات قديمة، بل تحفظها في أرشيف دائم.'
        ],
        actionLink: '/rollover',
        actionLabel: 'شاشة الترحيل'
      },
      {
        id: 'settings_security',
        category: 'system',
        icon: Settings,
        color: 'from-slate-500/20 to-zinc-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30',
        title: 'الإعدادات، المستخدمون، والصلاحيات',
        summary: 'هوية المدرسة، الختم والشعار، مصفوفة الصلاحيات، وإمكانية تخصيص وصول الموظف حسب الجنس.',
        steps: [
          {
            title: '1. هوية المؤسسة والختم الرسمي',
            desc: 'ارفع شعار المدرسة وختمها الرسمي ليظهرا تلقائياً على كل الوصولات والشهادات وقوائم النداء. حدد العنوان، الهاتف، والعملة المتداولة (مثل د.ج).'
          },
          {
            title: '2. إدارة حسابات الموظفين والصلاحيات',
            desc: 'أنشئ حسابات للموظفين والأساتذة مع منحهم صلاحيات محددة بدقة (الطلبة، المالية، الحضور، الإعدادات، جدول التوقيت).'
          },
          {
            title: '3. صلاحية الوصول حسب الجنس (Staff Gender Access)',
            desc: 'في حال تفعيل سياسة فصل الجنسين، يمكنك تحديد إمكانية رؤية كل مستخدم: (الكل، ذكور فقط، أو إناث فقط). فالمشرفة على قسم الإناث مثلاً لن ترى إلا أفواج وطالبات الإناث حفاظاً على الخصوصية.'
          }
        ],
        tips: [
          'كل العمليات الحساسة (الحذف، تعديل الصلاحيات، تغيير الإعدادات) مسجلة في شاشة "سجل التدقيق" (Audit Logs).',
          'حساب مدير النظام (ADMIN) يمتلك وصولاً كاملاً وشاملاً لكافة البيانات.'
        ],
        actionLink: '/settings',
        actionLabel: 'فتح الإعدادات'
      }
    ];
  }, [lang]);

  // Categories definition
  const categories = useMemo(() => [
    { id: 'all', label: lang === 'ar' ? 'جميع الأقسام' : lang === 'fr' ? 'Toutes les rubriques' : 'All Topics', icon: HelpCircle },
    { id: 'start', label: lang === 'ar' ? 'البداية السريعة' : lang === 'fr' ? 'Démarrage' : 'Quick Start', icon: Sparkles },
    { id: 'academic', label: lang === 'ar' ? 'الأفواج والتعليم' : lang === 'fr' ? 'Pédagogie & Groupes' : 'Academic & Groups', icon: Layers },
    { id: 'students', label: lang === 'ar' ? 'الطلبة والتحويلات' : lang === 'fr' ? 'Élèves & Transferts' : 'Students & Transfers', icon: Users },
    { id: 'store', label: lang === 'ar' ? 'المتجر والمبيعات' : lang === 'fr' ? 'Boutique & Ventes' : 'Store & Products', icon: ShoppingBag },
    { id: 'finance', label: lang === 'ar' ? 'المالية والوصولات' : lang === 'fr' ? 'Finances & Reçus' : 'Finance & Receipts', icon: Wallet },
    { id: 'system', label: lang === 'ar' ? 'النظام والإعدادات' : lang === 'fr' ? 'Système & Sécurité' : 'System & Settings', icon: Settings },
  ], [lang]);

  // Filtered list
  const filteredGuides = useMemo(() => {
    return guideData.filter(item => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory;
      if (!matchCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inTitle = item.title.toLowerCase().includes(q);
      const inSummary = item.summary.toLowerCase().includes(q);
      const inSteps = item.steps.some(s => s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q));
      const inTips = item.tips.some(t => t.toLowerCase().includes(q));
      return inTitle || inSummary || inSteps || inTips;
    });
  }, [guideData, activeCategory, searchQuery]);

  const toggleSection = (id) => {
    setExpandedSection(prev => (prev === id ? null : id));
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-surface-card border border-primary/20 p-6 sm:p-8 lg:p-10 shadow-sm">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-black">
            <HelpCircle className="w-4 h-4" />
            <span>
              {lang === 'ar' ? 'دليل الاستخدام الشامل والمركز التعليمي' : lang === 'fr' ? 'Centre d’Aide & Documentation' : 'Help Center & Complete User Guide'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-text-main tracking-tight font-cairo">
            {lang === 'ar' 
              ? 'كيف تستخدم منصة قاف غو وتتقن كافة خصائصها؟' 
              : lang === 'fr' 
              ? 'Comment utiliser la plateforme QafGo et maîtriser ses fonctionnalités ?' 
              : 'How to use QafGo platform and master all its features?'}
          </h1>

          <p className="text-sm sm:text-base text-text-muted leading-relaxed">
            {lang === 'ar'
              ? 'دليل تفاعلي خطوة بخطوة موجه لمديري الحلقات والموظفين والمشايخ، يوضح كيفية التعامل مع الأفواج، تسجيل الطلبة، متابعة الحضور والتقييمات، تسيير المالية، وضبط سياسات الأمان وفصل الجنسين.'
              : lang === 'fr'
              ? 'Guide interactif pas à pas destiné aux administrateurs, coordinateurs et enseignants pour gérer les groupes, inscriptions d’élèves, présences, finances et règles de séparation des genres.'
              : 'Interactive step-by-step documentation for school managers, coordinators, and teachers on handling groups, student admissions, attendance, financial ledgers, and gender policies.'}
          </p>

          {/* Live Search Bar */}
          <div className="relative pt-2">
            <div className="relative flex items-center">
              <Search className={`absolute ${isRtl ? 'right-4' : 'left-4'} w-5 h-5 text-text-muted pointer-events-none`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === 'ar'
                    ? 'ابحث في الدليل (مثال: تسجيل طالب، فصل الجنسين، طباعة وصل، نقل طالب، الحضور...)'
                    : lang === 'fr'
                    ? 'Rechercher dans le guide (ex: inscription élève, séparation genres, reçu, transfert...)'
                    : 'Search guide (e.g. register student, gender policy, print receipt, transfer...)'
                }
                className={`w-full h-14 ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} rounded-2xl bg-surface border border-border focus:border-primary focus:ring-4 focus:ring-primary/15 text-sm sm:text-base text-text-main placeholder:text-text-muted shadow-sm transition-all outline-none`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={`absolute ${isRtl ? 'left-4' : 'right-4'} text-xs font-bold text-text-muted hover:text-text-main bg-surface-hover px-2 py-1 rounded-lg`}
                >
                  {lang === 'ar' ? 'مسح' : lang === 'fr' ? 'Effacer' : 'Clear'}
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Decorative Background Accent */}
        <div className="absolute -bottom-12 -end-12 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary text-primary-contrast shadow-md scale-[1.02]'
                  : 'bg-surface-card hover:bg-surface-hover text-text-muted hover:text-text-main border border-border'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Guides Grid / Accordion */}
      {filteredGuides.length === 0 ? (
        <div className="text-center py-16 bg-surface-card rounded-3xl border border-border p-8">
          <Info className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-text-main">
            {lang === 'ar' ? 'لم يتم العثور على نتائج مطابقة' : lang === 'fr' ? 'Aucun résultat trouvé' : 'No matching results found'}
          </h3>
          <p className="text-sm text-text-muted mt-1 max-w-md mx-auto">
            {lang === 'ar' 
              ? `لا توجد مقالات دليل تطابق "${searchQuery}". جرب البحث بكلمات أبسط أو تصفح الأقسام مباشرة.` 
              : lang === 'fr'
              ? `Aucun article de documentation ne correspond à "${searchQuery}". Essayez avec d'autres mots-clés ou parcourez les rubriques.`
              : `No documentation matching "${searchQuery}". Try using simpler keywords or browse categories directly.`}
          </p>
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
            className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-contrast text-xs font-bold transition-transform hover:scale-[1.02] cursor-pointer"
          >
            {lang === 'ar' ? 'عرض جميع المواضيع' : lang === 'fr' ? 'Afficher toutes les rubriques' : 'Show All Topics'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredGuides.map((guide) => {
            const Icon = guide.icon;
            const isExpanded = expandedSection === guide.id;

            return (
              <div
                key={guide.id}
                className="bg-surface-card rounded-3xl border border-border hover:border-primary/30 transition-all shadow-sm overflow-hidden"
              >
                {/* Header / Clickable summary row */}
                <button
                  type="button"
                  onClick={() => toggleSection(guide.id)}
                  className="w-full text-start p-5 sm:p-6 flex items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface-hover/50 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${guide.color} border shadow-inner shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-black text-text-main font-cairo">
                        {guide.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-text-muted mt-0.5 line-clamp-2">
                        {guide.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-center">
                    <span className="hidden sm:inline-block text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">
                      {isExpanded 
                        ? (lang === 'ar' ? 'طي التفاصيل' : lang === 'fr' ? 'Réduire' : 'Collapse') 
                        : (lang === 'ar' ? 'عرض الدليل' : lang === 'fr' ? 'Consulter' : 'View Guide')}
                    </span>
                    <div className={`w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      <ChevronDown className="w-4 h-4 text-text-muted" />
                    </div>
                  </div>
                </button>

                {/* Expanded Detailed Steps */}
                {isExpanded && (
                  <div className="p-5 sm:p-8 pt-0 border-t border-border/60 bg-surface/40 space-y-6 animate-fadeIn">
                    
                    {/* Visual Interface Screenshot / Illustration */}
                    {guide.image && (
                      <div className="pt-6">
                        <div className="relative rounded-2xl overflow-hidden border border-border shadow-md bg-surface group">
                          <img
                            src={guide.image}
                            alt={guide.imageCaption || guide.title}
                            className="w-full max-h-96 object-cover object-top hover:scale-[1.01] transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="p-3 bg-surface-card/90 backdrop-blur-xs border-t border-border flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
                              <ImageIcon className="w-4 h-4 text-primary" />
                              <span>{guide.imageCaption || guide.title}</span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              {lang === 'ar' ? 'معاينة توضيحية للواجهة' : lang === 'fr' ? 'Aperçu de l’interface' : 'UI Interface Preview'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Steps List */}
                    <div className="space-y-4 pt-4">
                      <h3 className="text-xs font-black text-text-muted uppercase tracking-wider">
                        {lang === 'ar' ? 'الخطوات والإرشادات العملية:' : lang === 'fr' ? 'Étapes et instructions pratiques :' : 'Practical Step-by-Step Instructions:'}
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {guide.steps.map((step, idx) => (
                          <div
                            key={idx}
                            className="bg-surface-card rounded-2xl border border-border/80 p-4 sm:p-5 flex flex-col justify-between space-y-2 shadow-sm"
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center border border-primary/20">
                                  {idx + 1}
                                </span>
                                <h4 className="text-sm font-extrabold text-text-main">
                                  {step.title}
                                </h4>
                              </div>
                              <p className="text-xs text-text-muted leading-relaxed">
                                {step.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pro-Tips & Direct Action Link */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{lang === 'ar' ? 'نصائح مهمة وتنبيهات:' : lang === 'fr' ? 'Conseils importants :' : 'Important Pro-Tips:'}</span>
                        </div>
                        <ul className="list-disc list-inside text-xs text-text-muted space-y-0.5">
                          {guide.tips.map((tip, tIdx) => (
                            <li key={tIdx}>{tip}</li>
                          ))}
                        </ul>
                      </div>

                      {guide.actionLink && (
                        <Link
                          to={guide.actionLink}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-contrast text-xs font-black shadow hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
                        >
                          <span>{guide.actionLabel}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quick FAQ / Contact Admin Card */}
      <div className="rounded-3xl bg-surface-card border border-border p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-primary/10 text-primary border border-primary/25 shrink-0">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-text-main">
              {lang === 'ar' ? 'هل تحتاج إلى مساعدة إضافية أو تدريب خاص؟' : lang === 'fr' ? 'Besoin d’aide supplémentaire ?' : 'Need further assistance or personalized help?'}
            </h3>
            <p className="text-xs sm:text-sm text-text-muted mt-1">
              {lang === 'ar'
                ? 'فريق إدارة منصة قاف غو والمشرف العام مستعدون دائماً للإجابة عن تساؤلاتكم ومساعدتكم في ضبط الإعدادات.'
                : lang === 'fr'
                ? 'L’équipe administrative de QafGo est disponible pour vous accompagner dans la prise en main de la plateforme.'
                : 'The QafGo support and school administration team are available to help configure your workflows.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
          <Link
            to="/settings"
            className="w-full md:w-auto text-center px-5 py-3 rounded-2xl bg-surface hover:bg-surface-hover border border-border text-xs font-black text-text-main transition-colors"
          >
            {lang === 'ar' ? 'الإعدادات العامة' : lang === 'fr' ? 'Paramètres généraux' : 'General Settings'}
          </Link>
          <Link
            to="/"
            className="w-full md:w-auto text-center px-5 py-3 rounded-2xl bg-primary text-primary-contrast text-xs font-black shadow transition-all hover:opacity-95"
          >
            {lang === 'ar' ? 'لوحة القيادة الرئيسية' : lang === 'fr' ? 'Tableau de bord' : 'Main Dashboard'}
          </Link>
        </div>
      </div>

    </div>
  );
}
