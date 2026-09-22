import { LoginForm } from "./LoginForm";
import { AppLogo } from "@/components/AppLogo";
import "./LoginPage.css";

export function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-shell">
        <aside className="login-brand-panel" aria-label="Hospital Management System">
          <div className="login-brand-panel__logo">
            <AppLogo variant="full" effect3d className="login-brand-logo" />
          </div>

          <p className="login-brand-panel__quote">
            We are always fully focused on helping your care.
          </p>
        </aside>

        <section className="login-form-panel">
          <header className="login-form-panel__header">
            <div className="login-form-panel__mark" aria-hidden="true">
              <AppLogo variant="mark" effect3d decorative />
            </div>
            <h1>Log in</h1>
            <p>Sign in with your username or email to open your role dashboard.</p>
          </header>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
