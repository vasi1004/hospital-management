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

  const [username, setUsername] = useState("");
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
    if (!username.trim() || !password) return;
    dispatch(
      login({
        username: username.trim(),
        password,
      }),
    );
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <div className="login-field">
        <label htmlFor={usernameId}>Username</label>
        <input
          id={usernameId}
          name="username"
          type="text"
          autoComplete="username"
          placeholder="Enter username"
          value={username}
          disabled={isLoading}
          onChange={(event) => {
            if (error) dispatch(clearAuthError());
            setUsername(event.target.value);
          }}
          required
          minLength={3}
        />
      </div>

      <div className="login-field">
        <div className="login-field__label-row">
          <label htmlFor={passwordId}>Password</label>
          <button
            type="button"
            className="login-ghost-btn"
            onClick={() => setShowPassword((value) => !value)}
            disabled={isLoading}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
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
      </div>

      {error ? (
        <p className="login-error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="login-submit"
        disabled={isLoading || !username.trim() || password.length < 8}
      >
        {isLoading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
