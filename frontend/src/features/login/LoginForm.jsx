import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getRoleHome } from "@/constants/roles";
import { clearAuthError, login } from "./authSlice";

export function LoginForm() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, error, user } = useAppSelector((state) => state.auth);

  const usernameId = useId();
  const passwordId = useId();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isLoading = status === "loading";

  useEffect(() => {
    if (status === "authenticated" && user) {
      navigate(getRoleHome(user.role), { replace: true });
    }
  }, [status, user, navigate]);

  function handleSubmit(event) {
    event.preventDefault();
    const loginId = identifier.trim();
    if (!loginId || !password) return;
    dispatch(
      login({
        // Backend accepts username or email in this field.
        username: loginId,
        password,
      }),
    );
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <div className="login-field">
        <label htmlFor={usernameId}>Username or email</label>
        <input
          id={usernameId}
          name="username"
          type="text"
          inputMode="email"
          autoComplete="username"
          placeholder="Enter username or email"
          value={identifier}
          disabled={isLoading}
          onChange={(event) => {
            if (error) dispatch(clearAuthError());
            setIdentifier(event.target.value);
          }}
          required
          minLength={3}
        />
      </div>

      <div className="login-field">
        <label htmlFor={passwordId}>Password</label>
        <div className="login-field__password">
          <input
            id={passwordId}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter password"
            value={password}
            disabled={isLoading}
            onChange={(event) => {
              if (error) dispatch(clearAuthError());
              setPassword(event.target.value);
            }}
            required
            minLength={8}
          />
          <button
            type="button"
            className="login-eye-btn"
            onClick={() => setShowPassword((value) => !value)}
            disabled={isLoading}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3 3l18 18M10.5 10.7a2.5 2.5 0 0 0 3.5 3.5M9.9 5.2A10.5 10.5 0 0 1 12 5c5.2 0 9.2 3.4 10.5 7-0.5 1.4-1.4 2.8-2.6 3.9M6.1 6.2C4.5 7.4 3.3 9 2.5 12c1.3 3.6 5.3 7 10.5 7 1.4 0 2.7-.2 3.9-.7"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M2.5 12C3.8 8.4 7.8 5 12 5s8.2 3.4 9.5 7c-1.3 3.6-5.3 7-9.5 7s-8.2-3.4-9.5-7Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="3"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {error ? (
        <p className="login-error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="login-submit"
        disabled={isLoading || !identifier.trim() || password.length < 8}
      >
        {isLoading ? "Signing in…" : "Log in"}
      </button>
    </form>
  );
}
