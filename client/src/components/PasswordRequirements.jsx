import { checkPasswordRules } from "../utils/passwordRules.js";

const REQUIREMENTS = [
  { key: "minLength", label: "At least 8 characters" },
  { key: "hasLowercase", label: "At least 1 lowercase letter" },
  { key: "hasUppercase", label: "At least 1 uppercase letter" },
  { key: "hasNumber", label: "At least 1 number" },
  { key: "hasSpecialChar", label: "At least 1 special character" },
  { key: "noEdgeWhitespace", label: "No leading or trailing spaces" },
];

function PasswordRequirements({ password }) {
  const rules = checkPasswordRules(password);

  return (
    <div className="password-requirements">
      {REQUIREMENTS.map(({ key, label }) => {
        const met = rules[key];
        return (
          <div key={key} className={`password-requirement${met ? " password-requirement--met" : ""}`}>
            <span className="password-requirement-dot">
              {met && (
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 6.5l2.5 2.5 4.5-5.5" />
                </svg>
              )}
            </span>
            {label}
          </div>
        );
      })}
    </div>
  );
}

export default PasswordRequirements;