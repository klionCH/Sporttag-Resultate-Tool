import jwt from "jsonwebtoken";

export function getUserFromRequest(req) {
    const cookieHeader = req.headers.get("cookie") || "";

    const token = cookieHeader
        .split(";")
        .find((c) => c.trim().startsWith("authToken="))
        ?.split("=")[1];

    if (!token) throw new Error("Nicht eingeloggt");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded; // { id, username, role }
}

// ✅ Eine von mehreren Rollen zulassen
export function requireAnyRole(req, allowedRoles = []) {
    const user = getUserFromRequest(req);
    if (!allowedRoles.includes(user.role)) {
        const err = new Error("Keine Berechtigung");
        err.status = 403;
        throw err;
    }
    return user;
}
