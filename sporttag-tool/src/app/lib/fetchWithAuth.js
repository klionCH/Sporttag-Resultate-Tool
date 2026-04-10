export async function fetch(url, options = {}) {
    const res = await fetch(url, {
        ...options,
        credentials: "include"
    });

    if (res.status === 401 || res.status === 403) {
        console.warn("⚠️ Nicht autorisiert. Weiterleitung zur Login-Seite.");
        window.location.href = "/login";
        return null;
    }

    return res;
}
