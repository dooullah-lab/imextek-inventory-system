// middleware/auth.js
// Like a bouncer at a club door: checks your wristband (JWT) before
// letting you into any room except the login page itself.

const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization; // expects "Bearer <token>"

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No access token provided. Please log in." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
  }
}

// Like a VIP-only room: only "admin" role can pass.
function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admins only." });
  }
  next();
}

// General-purpose door check: pass in a list of allowed roles,
// e.g. requireRole(["admin", "manager"])
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to do this." });
    }
    next();
  };
}

module.exports = { requireAuth, requireAdmin, requireRole };
