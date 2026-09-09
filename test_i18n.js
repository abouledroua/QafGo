import { translate } from './backend/utils/i18n.js';

console.log('Arabic:', translate('student_created_success', 'ar'));
console.log('English:', translate('student_created_success', 'en'));
console.log('French:', translate('student_created_success', 'fr'));
console.log('Param test:', translate('student_cannot_delete_active_enrollment', 'en', { name: 'Youssef', groups: 'Group A' }));
console.log('French Param test:', translate('student_cannot_delete_active_enrollment', 'fr', { name: 'Youssef', groups: 'Groupe A' }));
