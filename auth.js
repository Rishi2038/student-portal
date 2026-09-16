const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');

const SECRET_KEY = process.env.SESSION_SECRET || 'student_portal_secure_secret_key_2026';

function createToken(payload) {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  });
  const encodedData = Buffer.from(data).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(encodedData).digest('base64url');
  return `${encodedData}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedData, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(encodedData).digest('base64url');
  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedData, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const token = req.cookies.session_token;
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      // Fetch latest user info from DB to ensure still valid
      const user = db.getUserById(payload.id);
      if (user) {
        req.user = {
          id: user.id,
          roll_no: user.roll_no,
          name: user.name,
          role: user.role,
          cgpa: user.cgpa,
          attendance: user.attendance,
          department: user.department
        };
      }
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required.' });
  }
  next();
}

function requireStudent(req, res, next) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ error: 'Forbidden: Student access required.' });
  }
  next();
}

module.exports = {
  createToken,
  verifyToken,
  authMiddleware,
  requireAuth,
  requireAdmin,
  requireStudent
};
