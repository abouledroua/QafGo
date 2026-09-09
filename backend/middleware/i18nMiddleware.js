import { translate } from '../utils/i18n.js';

/**
 * i18n Middleware: Extracts language from Accept-Language header or query param
 * and attaches req.t(key, params) and req.lang to request object
 */
export default function i18nMiddleware(req, res, next) {
  let lang = 'ar';

  const queryLang = req.query?.lang;
  const headerLang = req.headers['accept-language'];

  if (queryLang && ['ar', 'en', 'fr'].includes(queryLang.toLowerCase())) {
    lang = queryLang.toLowerCase();
  } else if (headerLang) {
    const raw = headerLang.toLowerCase();
    if (raw.startsWith('fr')) lang = 'fr';
    else if (raw.startsWith('en')) lang = 'en';
    else if (raw.startsWith('ar')) lang = 'ar';
  }

  req.lang = lang;
  req.t = (key, params) => translate(key, lang, params);

  next();
}
