/**
 * Backend i18n Dictionary & Translation Service (AR, EN, FR)
 */

export const translations = {
  ar: {
    // General
    success: 'تمت العملية بنجاح',
    unhandled_server_error: 'حدث خطأ غير متوقع في الخادم',
    bad_request: 'البيانات المرسلة غير صالحة',
    not_found: 'العنصر المطلوب غير موجود',
    unauthorized: 'غير مصرح بالوصول، يرجى تسجيل الدخول',
    forbidden: 'ليس لديك صلاحية لتنفيذ هذا الإجراء',
    upload_success: 'تم رفع الملف بنجاح',
    upload_failed: 'فشل رفع الملف',

    // Students
    student_created_success: 'تم تسجيل الطالب بنجاح',
    student_updated_success: 'تم تحديث بيانات الطالب بنجاح',
    student_deleted_success: 'تم حذف الطالب بنجاح',
    student_not_found: 'الطالب غير موجود',
    student_cannot_delete_active_enrollment: 'لا يمكن حذف الطالب ({name}) لأنه مسجل حالياً في الأفواج النشطة التالية: {groups}. يجب إلغاء تسجيله من الفوج أولاً.',
    student_required_fields: 'يرجى إدخال اسم الطالب الرباعي ورقم هاتف الولي',
    recalculate_debt_success: 'تمت إعادة حساب وتحديث وضعيات الديون والمستحقات لكافة الطلبة بنجاح',

    // Groups
    group_created_success: 'تم إنشاء الفوج بنجاح وهو في حالة الانتظار (En instance)',
    group_updated_success: 'تم تحديث بيانات الفوج بنجاح',
    group_status_updated_success: 'تم تحديث حالة الفوج بنجاح',
    group_not_found: 'الفوج غير موجود',
    group_room_updated_success: 'تم تحديث قاعة الفوج بنجاح',
    group_teacher_reassigned_success: 'تم تعيين الأستاذ الجديد للفوج بنجاح',

    // Teachers
    teacher_created_success: 'تمت إضافة الأستاذ بنجاح',
    teacher_updated_success: 'تم تحديث بيانات الأستاذ بنجاح',
    teacher_deleted_success: 'تم حذف الأستاذ بنجاح',
    teacher_not_found: 'الأستاذ غير موجود',
    teacher_cannot_delete_has_groups: 'لا يمكن حذف الأستاذ لأنه مسؤول عن أفواج نشطة حالياً. يرجى إعادة تعيين أساتذة الأفواج أولاً.',
    teacher_name_phone_required: 'يرجى إدخال اسم الأستاذ ورقم هاتفه',

    // Enrollments & Transfers
    student_enrolled_success: 'تم تسجيل الطالب في الفوج بنجاح',
    student_already_enrolled: 'الطالب مسجل بالفعل في هذا الفوج',
    student_unenrolled_success: 'تم إلغاء تسجيل الطالب من الفوج بنجاح',
    student_stopped_success: 'تم إيقاف الطالب عن الفوج بنجاح',
    student_already_stopped: 'الطالب متوقف بالفعل عن هذا الفوج',
    student_resumed_success: 'تم استئناف دراسة الطالب في الفوج بنجاح',
    student_already_active: 'الطالب نشط ومسجل بالفعل في هذا الفوج',
    enrollment_not_found: 'التسجيل غير موجود',
    student_transfer_success: 'تم تحويل الطالب بنجاح من الفوج السابق إلى الفوج الجديد',
    transfer_reason_required: 'يرجى تحديد سبب التحويل والفوج المستهدف',
    transfer_same_group_error: 'لا يمكن تحويل الطالب إلى نفس الفوج الحالي',
    forbidden_gender_access: 'ليس لديك صلاحية للوصول إلى بيانات هذا الجنس',
    group_gender_required: 'يرجى تحديد جنس الفوج (ذكور أو إناث)',
    student_gender_mismatch_group: 'لا يمكن تسجيل أو تحويل طالب في فوج مخصص للجنس الآخر (يجب تطابق الجنس)',
    student_gender_change_has_groups: 'لا يمكن تغيير جنس الطالب لأنه مسجل حالياً في أفواج مخصصة لجنسه السابق ({groups}). يجب إلغاء تسجيله أولاً.',

    // Attendance & Substitution
    attendance_saved_success: 'تم حفظ تسجيل الحضور بنجاح',
    attendance_range_sub_success: 'تم تطبيق الاستخلاف للفترة المحددة بنجاح',
    attendance_range_missing_fields: 'يرجى اختيار الأستاذ المستخلف وتاريخي البداية والنهاية',

    // Evaluations
    evaluation_saved_success: 'تم حفظ سجل التقييم بنجاح',
    evaluation_not_found: 'سجل التقييم غير موجود',

    // Classrooms & Timetables
    classroom_created_success: 'تمت إضافة القاعة بنجاح',
    classroom_updated_success: 'تم تحديث بيانات القاعة بنجاح',
    classroom_deleted_success: 'تم حذف القاعة بنجاح',
    classroom_not_found: 'القاعة غير موجودة',
    timetable_slot_created_success: 'تمت إضافة الحصة إلى جدول الأوقات بنجاح',
    timetable_slot_deleted_success: 'تم حذف الحصة من جدول الأوقات بنجاح',
    timetable_clash_detected: 'تعارض في جدول التوقيت: القاعة أو الأستاذ محجوز لحصة أخرى في هذا التوقيت',
    timetable_conflict_room: 'تعارض في القاعة: القاعة ({room}) محجوزة مسبقاً لفوج ({group}) في نفس هذا التوقيت ({time})',
    timetable_conflict_teacher: 'تعارض في جدول الأستاذ: الأستاذ ({teacher}) لديه حصة أخرى مبرمجة لفوج ({group}) في نفس التوقيت ({time})',
    timetable_conflict_group: 'تعارض في الفوج: الفوج لديه حصة أخرى مبرمجة مسبقاً في نفس هذا التوقيت ({time})',
    settings_image_format_error: 'الملف يجب أن يكون صورة بصيغة JPG, PNG, WEBP أو SVG',

    // Finance
    payment_recorded_success: 'تم تسجيل سند القبض والاشتراك بنجاح',
    payment_not_found: 'سجل الدفعة غير موجود',
    expense_recorded_success: 'تم تسجيل سند الصرف بنجاح',
    payment_amount_invalid: 'المبلغ المدفوع غير صالح',
    duplicate_receipt_error: 'يوجد وصل مسجل مسبقاً لهذا الشهر برقم: {receipt_no}',
    duplicate_receipt_multi_error: 'الأشهر التالية مسددة أو معفاة مسبقاً: {months}',
    refund_processed_success: 'تم تسجيل استرداد المبلغ بنجاح',
    refund_amount_exceeds_paid: 'مبلغ الاسترداد لا يمكن أن يتجاوز المبلغ المدفوع المتبقي ({max})',
    invalid_refund_amount: 'مبلغ الاسترداد غير صالح',

    // Academic Years
    academic_year_created_success: 'تم إنشاء الموسم الدراسي بنجاح',
    academic_year_activated_success: 'تم تفعيل الموسم الدراسي بنجاح',
    academic_year_rollover_success: 'تم إتمام الانتقال السنوي وترحيل الطلبة بنجاح',

    // Settings & Auth & Backup
    settings_saved_success: 'تم حفظ الإعدادات بنجاح',
    backup_download_error: 'فشل تصدير قاعدة البيانات',
    backup_run_success: 'تم حفظ النسخة الاحتياطية بنجاح في المجلد المحدد',
    backup_run_error: 'فشل إجراء النسخ الاحتياطي',
    backup_status_error: 'فشل استرجاع حالة النسخ الاحتياطي',
    enter_folder_first: 'يرجى إدخال مسار المجلد للتحقق منه',
    folder_valid_success: 'المجلد صالح وجاهز لحفظ النسخ الاحتياطية',
    folder_invalid_error: 'المسار المحدد غير صالح أو غير متاح للكتابة',
    folder_explore_error: 'فشل استكشاف المجلدات',
    folder_specify_parent: 'يرجى تحديد المجلد الأصلي واسم المجلد الجديد',
    folder_invalid_chars: 'اسم المجلد يحتوي على رموز غير صالحة',
    folder_created_success: 'تم إنشاء المجلد بنجاح',
    folder_picker_create_error: 'فشل إنشاء المجلد',
    auth_login_success: 'تم تسجيل الدخول بنجاح',
    auth_invalid_credentials: 'بيانات الاعتماد غير صحيحة (اسم المستخدم أو كلمة المرور)',
    auth_missing_fields: 'يرجى إدخال اسم المستخدم وكلمة المرور'
  },

  en: {
    // General
    success: 'Operation completed successfully',
    unhandled_server_error: 'An unexpected server error occurred',
    bad_request: 'Invalid request data',
    not_found: 'Requested item not found',
    unauthorized: 'Unauthorized access, please log in',
    forbidden: 'You do not have permission to perform this action',
    upload_success: 'File uploaded successfully',
    upload_failed: 'File upload failed',

    // Students
    student_created_success: 'Student registered successfully',
    student_updated_success: 'Student details updated successfully',
    student_deleted_success: 'Student removed successfully',
    student_not_found: 'Student not found',
    student_cannot_delete_active_enrollment: 'Cannot delete student ({name}) because they are actively enrolled in: {groups}. Please unenroll them first.',
    student_required_fields: 'Please enter student full name and guardian phone number',
    recalculate_debt_success: 'All student balance and debt statuses recalculated successfully',

    // Groups
    group_created_success: 'Group created successfully in pending status',
    group_updated_success: 'Group details updated successfully',
    group_status_updated_success: 'Group status updated successfully',
    group_not_found: 'Group not found',
    group_room_updated_success: 'Classroom assigned successfully',
    group_teacher_reassigned_success: 'New teacher assigned to group successfully',

    // Teachers
    teacher_created_success: 'Teacher added successfully',
    teacher_updated_success: 'Teacher details updated successfully',
    teacher_deleted_success: 'Teacher removed successfully',
    teacher_not_found: 'Teacher not found',
    teacher_cannot_delete_has_groups: 'Cannot delete teacher who is currently assigned to active groups. Please reassign the groups first.',
    teacher_name_phone_required: 'Please provide teacher name and phone number',

    // Enrollments & Transfers
    student_enrolled_success: 'Student enrolled in group successfully',
    student_already_enrolled: 'Student is already enrolled in this group',
    student_unenrolled_success: 'Student unenrolled from group successfully',
    student_stopped_success: 'Student paused from group successfully',
    student_already_stopped: 'Student is already paused in this group',
    student_resumed_success: 'Student enrollment resumed successfully',
    student_already_active: 'Student is already active in this group',
    enrollment_not_found: 'Enrollment record not found',
    student_transfer_success: 'Student transferred successfully to the new group',
    transfer_reason_required: 'Please specify the transfer reason and target group',
    transfer_same_group_error: 'Cannot transfer student to the same group',
    forbidden_gender_access: 'You do not have permission to access data for this gender',
    group_gender_required: 'Please specify group gender (Male or Female)',
    student_gender_mismatch_group: 'Cannot enroll/transfer student into an opposite-gender group',
    student_gender_change_has_groups: 'Cannot change student gender while enrolled in gender-specific groups ({groups}). Please unenroll first.',

    // Attendance & Substitution
    attendance_saved_success: 'Attendance recorded successfully',
    attendance_date_required: 'Please select a session date',
    substitute_recorded_success: 'Substitute teacher session recorded successfully',
    substitute_deleted_success: 'Substitute record deleted successfully',
    substitute_not_found: 'Substitute record not found',
    substitute_same_teacher_error: 'Original teacher and substitute teacher cannot be the same',

    // Classrooms & Timetable
    classroom_created_success: 'Classroom created successfully',
    classroom_updated_success: 'Classroom updated successfully',
    classroom_deleted_success: 'Classroom deleted successfully',
    classroom_not_found: 'Classroom not found',
    classroom_cannot_delete_has_groups: 'Cannot delete classroom associated with active groups or timetable sessions',
    timetable_slot_created_success: 'Timetable session added successfully',
    timetable_slot_updated_success: 'Timetable session updated successfully',
    timetable_slot_deleted_success: 'Timetable session removed successfully',
    timetable_clash_detected: 'Schedule clash: Classroom or teacher is already booked for another session at this time',
    timetable_conflict_room: 'Room clash: Room ({room}) is already booked for group ({group}) at ({time})',
    timetable_conflict_teacher: 'Teacher clash: Teacher ({teacher}) has another scheduled session for group ({group}) at ({time})',
    timetable_conflict_group: 'Group clash: Group already has another session scheduled at ({time})',
    settings_image_format_error: 'File must be a valid image in JPG, PNG, WEBP, or SVG format',

    // Finance
    payment_recorded_success: 'Payment voucher and subscription recorded successfully',
    payment_not_found: 'Payment record not found',
    expense_recorded_success: 'Expense voucher recorded successfully',
    payment_amount_invalid: 'Invalid payment amount',
    duplicate_receipt_error: 'A receipt is already registered for this month with receipt number: {receipt_no}',
    duplicate_receipt_multi_error: 'The following months are already settled or exempted: {months}',
    refund_processed_success: 'Refund processed successfully',
    refund_amount_exceeds_paid: 'Refund amount cannot exceed remaining paid balance ({max})',
    invalid_refund_amount: 'Invalid refund amount',

    // Academic Years
    academic_year_created_success: 'Academic year created successfully',
    academic_year_activated_success: 'Academic year activated successfully',
    academic_year_rollover_success: 'Academic year rollover and student carryover completed successfully',

    // Settings & Auth & Backup
    settings_saved_success: 'Settings saved successfully',
    backup_download_error: 'Failed to export database backup',
    backup_run_success: 'Backup successfully saved to destination folder',
    backup_run_error: 'Failed to execute database backup',
    backup_status_error: 'Failed to retrieve backup scheduler status',
    enter_folder_first: 'Please enter a folder path to verify',
    folder_valid_success: 'Folder is valid and ready for saving backups',
    folder_invalid_error: 'Selected folder path is invalid or not writable',
    folder_explore_error: 'Failed to explore directories',
    folder_specify_parent: 'Please specify the parent folder and new folder name',
    folder_invalid_chars: 'Folder name contains invalid characters',
    folder_created_success: 'Folder created successfully',
    folder_picker_create_error: 'Failed to create folder',
    auth_login_success: 'Logged in successfully',
    auth_invalid_credentials: 'Invalid credentials (username or password)',
    auth_missing_fields: 'Please provide both username and password'
  },

  fr: {
    // General
    success: 'Opération effectuée avec succès',
    unhandled_server_error: 'Une erreur serveur inattendue est survenue',
    bad_request: 'Données de requête invalides',
    not_found: 'Élément introuvable',
    unauthorized: 'Accès non autorisé, veuillez vous connecter',
    forbidden: 'Vous n\'avez pas la permission d\'effectuer cette action',
    upload_success: 'Fichier téléversé avec succès',
    upload_failed: 'Fichier non valide ou échec du téléversement',

    // Students
    student_created_success: 'Élève inscrit avec succès',
    student_updated_success: 'Données de l\'élève mises à jour avec succès',
    student_deleted_success: 'Élève supprimé avec succès',
    student_not_found: 'Élève introuvable',
    student_cannot_delete_active_enrollment: 'Impossible de supprimer l\'élève ({name}) car il est actuellement inscrit dans les groupes actifs suivants : {groups}. Veuillez d\'abord le désinscrire.',
    student_required_fields: 'Veuillez saisir le nom complet de l\'élève et le numéro de téléphone du tuteur',
    recalculate_debt_success: 'Recalcul et mise à jour des dettes et cotisations des élèves effectués avec succès',

    // Groups
    group_created_success: 'Groupe créé avec succès en attente (En instance)',
    group_updated_success: 'Données du groupe mises à jour avec succès',
    group_status_updated_success: 'Statut du groupe mis à jour avec succès',
    group_not_found: 'Groupe introuvable',
    group_room_updated_success: 'Salle de cours attribuée avec succès',
    group_teacher_reassigned_success: 'Nouvel enseignant assigné au groupe avec succès',

    // Teachers
    teacher_created_success: 'Enseignant ajouté avec succès',
    teacher_updated_success: 'Données de l\'enseignant mises à jour avec succès',
    teacher_deleted_success: 'Enseignant supprimé avec succès',
    teacher_not_found: 'Enseignant introuvable',
    teacher_cannot_delete_has_groups: 'Impossible de supprimer l\'enseignant car il est actuellement responsable de groupes actifs. Veuillez d\'abord réassigner les groupes.',
    teacher_name_phone_required: 'Veuillez saisir le nom et le numéro de téléphone de l\'enseignant',

    // Enrollments & Transfers
    student_enrolled_success: 'Élève inscrit dans le groupe avec succès',
    student_already_enrolled: 'L\'élève est déjà inscrit dans ce groupe',
    student_unenrolled_success: 'Désinscription de l\'élève effectuée avec succès',
    student_stopped_success: 'Arrêt temporaire de l\'élève enregistré avec succès',
    student_already_stopped: 'L\'élève est déjà en arrêt temporaire pour ce groupe',
    student_resumed_success: 'Reprise des cours de l\'élève effectuée avec succès',
    student_already_active: 'L\'élève est déjà actif dans ce groupe',
    enrollment_not_found: 'Inscription introuvable',
    student_transfer_success: 'Élève transféré avec succès vers le nouveau groupe',
    transfer_reason_required: 'Veuillez préciser le motif du transfert et le groupe cible',
    transfer_same_group_error: 'Impossible de transférer l\'élève vers son groupe actuel',
    forbidden_gender_access: 'Vous n\'avez pas l\'autorisation d\'accéder aux données de ce genre',
    group_gender_required: 'Veuillez spécifier le genre du groupe (Garçons ou Filles)',
    student_gender_mismatch_group: 'Impossible d\'inscrire ou de transférer un élève dans un groupe réservé au genre opposé',
    student_gender_change_has_groups: 'Impossible de modifier le genre de l\'élève car il est inscrit dans des groupes non mixtes ({groups}). Veuillez d\'abord le désinscrire.',

    // Attendance & Substitution
    attendance_saved_success: 'Feuille de présence enregistrée avec succès',
    attendance_date_required: 'Veuillez sélectionner la date de la séance',
    substitute_recorded_success: 'Remplacement enregistré avec succès',
    substitute_deleted_success: 'Enregistrement de remplacement supprimé avec succès',
    substitute_not_found: 'Enregistrement de remplacement introuvable',
    substitute_same_teacher_error: 'L\'enseignant titulaire et le remplaçant ne peuvent pas être identiques',

    // Classrooms & Timetable
    classroom_created_success: 'Salle créée avec succès',
    classroom_updated_success: 'Salle mise à jour avec succès',
    classroom_deleted_success: 'Salle supprimée avec succès',
    classroom_not_found: 'Salle introuvable',
    classroom_cannot_delete_has_groups: 'Impossible de supprimer une salle associée à des groupes actifs ou à l\'emploi du temps',
    timetable_slot_created_success: 'Séance ajoutée à l\'emploi du temps avec succès',
    timetable_slot_updated_success: 'Séance mise à jour avec succès',
    timetable_slot_deleted_success: 'Séance supprimée de l\'emploi du temps avec succès',
    timetable_clash_detected: 'Conflit d\'horaire détecté: La salle ou l\'enseignant est déjà réservé pour une autre séance à cette heure',
    timetable_conflict_room: 'Conflit de salle: La salle ({room}) est déjà réservée pour le groupe ({group}) à cet horaire ({time})',
    timetable_conflict_teacher: 'Conflit d\'enseignant: L\'enseignant ({teacher}) a une autre séance programmée pour le groupe ({group}) à cet horaire ({time})',
    timetable_conflict_group: 'Conflit de groupe: Le groupe a déjà une autre séance programmée à cet horaire ({time})',
    settings_image_format_error: 'Le fichier doit être une image au format JPG, PNG, WEBP ou SVG',

    // Finance
    payment_recorded_success: 'Reçu de paiement enregistré avec succès',
    payment_not_found: 'Enregistrement de paiement introuvable',
    expense_recorded_success: 'Bon de dépense enregistré avec succès',
    payment_amount_invalid: 'Montant de paiement invalide',
    duplicate_receipt_error: 'Un reçu est déjà enregistré pour ce mois sous le numéro: {receipt_no}',
    duplicate_receipt_multi_error: 'Les mois suivants sont déjà réglés ou exonérés : {months}',
    refund_processed_success: 'Remboursement enregistré avec succès',
    refund_amount_exceeds_paid: 'Le montant du remboursement ne peut pas dépasser le montant restant payé ({max})',
    invalid_refund_amount: 'Montant du remboursement invalide',

    // Academic Years
    academic_year_created_success: 'Année scolaire créée avec succès',
    academic_year_activated_success: 'Année scolaire activée avec succès',
    academic_year_rollover_success: 'Transition annuelle et reconduction des élèves terminées avec succès',

    // Settings & Auth & Backup
    settings_saved_success: 'Paramètres enregistrés avec succès',
    backup_download_error: 'Échec du téléchargement de la base de données',
    backup_run_success: 'Sauvegarde enregistrée avec succès dans le dossier',
    backup_run_error: 'Échec de l\'exécution de la sauvegarde',
    backup_status_error: 'Échec de la récupération du statut de la sauvegarde',
    enter_folder_first: 'Veuillez saisir un chemin de dossier à vérifier',
    folder_valid_success: 'Le dossier est valide et prêt pour enregistrer les sauvegardes',
    folder_invalid_error: 'Le chemin de dossier sélectionné est invalide ou non accessible en écriture',
    folder_explore_error: 'Échec de l\'exploration des dossiers',
    folder_specify_parent: 'Veuillez spécifier le dossier parent et le nom du nouveau dossier',
    folder_invalid_chars: 'Le nom du dossier contient des caractères non valides',
    folder_created_success: 'Dossier créé avec succès',
    folder_picker_create_error: 'Échec de la création du dossier',
    auth_login_success: 'Connexion réussie',
    auth_invalid_credentials: 'Identifiants invalides (nom d\'utilisateur ou mot de passe)',
    auth_missing_fields: 'Veuillez saisir le nom d\'utilisateur et le mot de passe'
  }
};

/**
 * Format string with {param} replacement
 */
function interpolate(template, params = {}) {
  if (!template) return '';
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
}

/**
 * Translate key for given language
 */
export function translate(key, lang = 'ar', params = {}) {
  const selectedLang = ['ar', 'en', 'fr'].includes(lang) ? lang : 'ar';
  const dict = translations[selectedLang] || translations.ar;

  // Support namespaced keys like 'settings.backup_run_success' -> lookup both
  const subKey = typeof key === 'string' && key.includes('.') ? key.split('.').pop() : key;

  let rawText = dict[key] || (subKey ? dict[subKey] : undefined) || translations.ar[key] || (subKey ? translations.ar[subKey] : undefined);

  // If not found in dictionary and params is provided as a string fallback, use it
  if (!rawText && typeof params === 'string' && params.trim()) {
    return params;
  }

  if (!rawText) {
    rawText = key;
  }

  return interpolate(rawText, typeof params === 'object' && params !== null ? params : {});
}
