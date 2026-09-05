import { useCallback, useMemo, useState } from "react";
import { authApi } from "../api/authApi.js";
import { AuthContext, STORAGE_KEY } from "./authContext.js";

function readStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.user) return null;
    return parsed;
  } catch {
    // Corrupted/unexpected localStorage content -- treat as no session
    // rather than throwing during app boot.
    return null;
  }
}

export function AuthProvider({ children }) {
  // localStorage reads are synchronous, so hydration happens via lazy
  // initializers -- no loading phase, no effect, no cascading re-render.
  const [user, setUser] = useState(() => readStoredSession()?.user ?? null);
  const [token, setToken] = useState(() => readStoredSession()?.token ?? null);

  const persistSession = useCallback((nextToken, nextUser) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: nextToken, user: nextUser }),
    );
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Register does NOT log the person in -- the backend deliberately
  // returns just the created user, no token (spec.md §4.1 register flow
  // is separate from login). Caller redirects to /login afterward.
  const register = useCallback((payload) => authApi.register(payload), []);

  // Returns one of two shapes to the caller (the Login page), which
  // decides what to render next:
  //   { twoFactorRequired: false, user }                          -- session already persisted
  //   { twoFactorRequired: true, pendingToken, user: {name,email} } -- caller shows the code-entry step
  const login = useCallback(
    async (credentials) => {
      const res = await authApi.login(credentials);
      if (res.twoFactorEnrollmentRequired) {
        return {
          twoFactorEnrollmentRequired: true,
          enrollmentToken: res.enrollmentToken,
          user: res.user,
        };
      }
      if (res.twoFactorRequired) {
        return {
          twoFactorRequired: true,
          pendingToken: res.pendingToken,
          user: res.user,
        };
      }
      persistSession(res.token, res.user);
      return { twoFactorRequired: false, user: res.user };
    },
    [persistSession],
  );

  // Second step of organizer login -- exchanges the pending token + code
  // for a real session.
  const completeTwoFactorLogin = useCallback(
    async ({ pendingToken, code }) => {
      const res = await authApi.verifyTwoFactor({ pendingToken, code });
      persistSession(res.token, res.user);
      return { user: res.user, remainingBackupCodes: res.remainingBackupCodes };
    },
    [persistSession],
  );

  // Called after the forced-enrollment flow (task 1.17/1.18) confirms 2FA
  // is now on, so the locally held user snapshot reflects it without
  // requiring a fresh login.
  const completeTwoFactorEnrollment = useCallback(
    async ({ enrollmentToken, code }) => {
      const res = await authApi.verifyTwoFactorEnrollment({
        enrollmentToken,
        code,
      });
      persistSession(res.token, res.user);
      return { user: res.user };
    },
    [persistSession],
  );
const value = useMemo(
  () => ({
    user,
    token,
    isAuthenticated: Boolean(token && user),
    register,
    login,
    completeTwoFactorLogin,
    completeTwoFactorEnrollment,
    logout,
  }),
  [user, token, register, login, completeTwoFactorLogin, completeTwoFactorEnrollment, logout]
);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
