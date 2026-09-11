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
    student_transfer_success: 'تم تحويل الطالب بنجاح من الفوج السابق إلى الفوج الجديد',
    transfer_reason_required: 'يرجى تحديد سبب التحويل والفوج المستهدف',

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

    // Academic Years
    academic_year_created_success: 'تم إنشاء الموسم الدراسي بنجاح',
    academic_year_activated_success: 'تم تفعيل الموسم الدراسي بنجاح',
    academic_year_rollover_success: 'تم إتمام الانتقال السنوي وترحيل الطلبة بنجاح',

    // Settings & Auth
    settings_saved_success: 'تم حفظ الإعدادات بنجاح',
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
    student_deleted_success: 'Student deleted successfully',
    student_not_found: 'Student not found',
    student_cannot_delete_active_enrollment: 'Cannot delete student ({name}) because they are actively enrolled in group(s): {groups}. Please unenroll them first.',
    student_required_fields: 'Please enter the full student name and guardian phone number',
    recalculate_debt_success: 'Student debts and payment statuses recalculated successfully',

    // Groups
    group_created_success: 'Group created successfully in pending status (En instance)',
    group_updated_success: 'Group details updated successfully',
    group_status_updated_success: 'Group status updated successfully',
    group_not_found: 'Group not found',
    group_room_updated_success: 'Group classroom updated successfully',
    group_teacher_reassigned_success: 'New primary teacher assigned to group successfully',

    // Teachers
    teacher_created_success: 'Teacher added successfully',
    teacher_updated_success: 'Teacher details updated successfully',
    teacher_deleted_success: 'Teacher deleted successfully',
    teacher_not_found: 'Teacher not found',
    teacher_cannot_delete_has_groups: 'Cannot delete teacher because they are currently assigned to active groups. Please reassign those groups first.',
    teacher_name_phone_required: 'Please enter teacher name and phone number',

    // Enrollments & Transfers
    student_enrolled_success: 'Student enrolled in group successfully',
    student_already_enrolled: 'Student is already enrolled in this group',
    student_unenrolled_success: 'Student removed from group successfully',
    student_transfer_success: 'Student transferred successfully to the new group',
    transfer_reason_required: 'Please provide transfer reason and target group',

    // Attendance & Substitution
    attendance_saved_success: 'Attendance recorded successfully',
    attendance_range_sub_success: 'Temporary teacher substitution applied successfully',
    attendance_range_missing_fields: 'Please select substitute teacher and start/end dates',

    // Evaluations
    evaluation_saved_success: 'Evaluation record saved successfully',
    evaluation_not_found: 'Evaluation record not found',

    // Classrooms & Timetables
    classroom_created_success: 'Classroom added successfully',
    classroom_updated_success: 'Classroom updated successfully',
    classroom_deleted_success: 'Classroom deleted successfully',
    classroom_not_found: 'Classroom not found',
    timetable_slot_created_success: 'Timetable session added successfully',
    timetable_slot_deleted_success: 'Timetable session deleted successfully',
    timetable_clash_detected: 'Schedule clash detected: The classroom or teacher is already booked for another session at this time',
    timetable_conflict_room: 'Room conflict: Classroom ({room}) is already booked for group ({group}) at this time ({time})',
    timetable_conflict_teacher: 'Teacher conflict: Teacher ({teacher}) has another session scheduled for group ({group}) at this time ({time})',
    timetable_conflict_group: 'Group conflict: The group already has another session scheduled at this time ({time})',
    settings_image_format_error: 'File must be an image in JPG, PNG, WEBP, or SVG format',

    // Finance
    payment_recorded_success: 'Payment receipt recorded successfully',
    payment_not_found: 'Payment record not found',
    expense_recorded_success: 'Expense voucher recorded successfully',
    payment_amount_invalid: 'Invalid payment amount',
    duplicate_receipt_error: 'A receipt is already recorded for this month with number: {receipt_no}',

    // Academic Years
    academic_year_created_success: 'Academic year created successfully',
    academic_year_activated_success: 'Academic year activated successfully',
    academic_year_rollover_success: 'Academic year rollover and student carryover completed successfully',

    // Settings & Auth
    settings_saved_success: 'Settings saved successfully',
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
    upload_failed: 'Échec du téléversement du fichier',

    // Students
    student_created_success: 'Élève inscrit avec succès',
    student_updated_success: 'Données de l\'élève mises à jour avec succès',
    student_deleted_success: 'Élève supprimé avec succès',
    student_not_found: 'Élève introuvable',
    student_cannot_delete_active_enrollment: 'Impossible de supprimer l\'élève ({name}) car il est actuellement inscrit dans le(s) groupe(s) actif(s): {groups}. Veuillez d\'abord le désinscrire du groupe.',
    student_required_fields: 'Veuillez saisir le nom complet de l\'élève et le téléphone du tuteur',
    recalculate_debt_success: 'Les dettes et statuts financiers de tous les élèves ont été recalculés avec succès',

    // Groups
    group_created_success: 'Groupe créé avec succès en attente (En instance)',
    group_updated_success: 'Détails du groupe mis à jour avec succès',
    group_status_updated_success: 'Statut du groupe mis à jour avec succès',
    group_not_found: 'Groupe introuvable',
    group_room_updated_success: 'Salle du groupe mise à jour avec succès',
    group_teacher_reassigned_success: 'Nouvel enseignant assigné au groupe avec succès',

    // Teachers
    teacher_created_success: 'Enseignant ajouté avec succès',
    teacher_updated_success: 'Données de l\'enseignant mises à jour avec succès',
    teacher_deleted_success: 'Enseignant supprimé avec succès',
    teacher_not_found: 'Enseignant introuvable',
    teacher_cannot_delete_has_groups: 'Impossible de supprimer l\'enseignant car il est actuellement assigné à des groupes actifs. Veuillez d\'abord réassigner ces groupes.',
    teacher_name_phone_required: 'Veuillez renseigner le nom de l\'enseignant et son numéro de téléphone',

    // Enrollments & Transfers
    student_enrolled_success: 'Élève inscrit dans le groupe avec succès',
    student_already_enrolled: 'L\'élève est déjà inscrit dans ce groupe',
    student_unenrolled_success: 'Élève désinscrit du groupe avec succès',
    student_transfer_success: 'Élève transféré avec succès vers le nouveau groupe',
    transfer_reason_required: 'Veuillez préciser le motif du transfert et le groupe cible',

    // Attendance & Substitution
    attendance_saved_success: 'Feuille de présence enregistrée avec succès',
    attendance_range_sub_success: 'Remplacement temporaire appliqué avec succès pour la période',
    attendance_range_missing_fields: 'Veuillez sélectionner l\'enseignant remplaçant et les dates de début et fin',

    // Evaluations
    evaluation_saved_success: 'Évaluation enregistrée avec succès',
    evaluation_not_found: 'Évaluation introuvable',

    // Classrooms & Timetables
    classroom_created_success: 'Salle ajoutée avec succès',
    classroom_updated_success: 'Données de la salle mises à jour avec succès',
    classroom_deleted_success: 'Salle supprimée avec succès',
    classroom_not_found: 'Salle introuvable',
    timetable_slot_created_success: 'Séance ajoutée à l\'emploi du temps avec succès',
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

    // Academic Years
    academic_year_created_success: 'Année scolaire créée avec succès',
    academic_year_activated_success: 'Année scolaire activée avec succès',
    academic_year_rollover_success: 'Transition annuelle et reconduction des élèves terminées avec succès',

    // Settings & Auth
    settings_saved_success: 'Paramètres enregistrés avec succès',
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
  const rawText = dict[key] || translations.ar[key] || key;
  return interpolate(rawText, params);
}
