import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'غير مصرح: يرجى تسجيل الدخول أولاً' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'qafgo_super_secure_jwt_secret_key_2026');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'جلسة العمل منتهية الصلاحية أو غير صالحة' });
  }
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح: يرجى تسجيل الدخول أولاً' });
    }
    if (req.user.role === 'ADMIN' || allowedRoles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: 'ليس لديك صلاحية كافية لتنفيذ هذا الإجراء'
    });
  };
};

export const requirePermission = (permissionKey) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح: يرجى تسجيل الدخول أولاً' });
    }
    if (req.user.role === 'ADMIN') {
      return next();
    }
    const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    if (perms.includes(permissionKey)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: `ليس لديك صلاحية الوصول إلى قسم: ${permissionKey}`
    });
  };
};
