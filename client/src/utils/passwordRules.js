// Mirrors server/src/utils/validators.js validatePassword() exactly --
// keep both in sync, or the client will show "all requirements met" while
// the server still rejects the password.
export function checkPasswordRules(password) {
  const value = password || "";
  const rules = {
    minLength: value.length >= 8 && value.length <= 72,
    noEdgeWhitespace: value.length > 0 && !/^\s|\s$/.test(value),
    hasLowercase: /[a-z]/.test(value),
    hasUppercase: /[A-Z]/.test(value),
    hasNumber: /[0-9]/.test(value),
    hasSpecialChar: /[^A-Za-z0-9]/.test(value),
  };
  const allMet = Object.values(rules).every(Boolean);
  return { ...rules, allMet };
}