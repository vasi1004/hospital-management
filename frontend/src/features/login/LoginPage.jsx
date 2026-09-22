import { APP_NAME } from "@/constants/urls";
import { LoginForm } from "./LoginForm";
import "./LoginPage.css";

export function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-page__art" aria-hidden="true">
        <div className="login-page__orb login-page__orb--a" />
        <div className="login-page__orb login-page__orb--b" />
        <div className="login-page__grid" />
      </div>

      <section className="login-hero-copy" aria-hidden="false">
        <p className="login-kicker">Hospital Management System</p>
        <h1 className="login-brand">{APP_NAME}</h1>
        <p className="login-lead">
          One calm workspace for clinicians, reception, and care teams —
          appointments, records, and people in sync.
        </p>
      </section>

      <section className="login-card">
        <header className="login-card__header">
          <p className="login-card__eyebrow">Secure sign in</p>
          <h2>Welcome back</h2>
          <p className="login-card__subtitle">
            Use your hospital credentials to open your role dashboard.
          </p>
        </header>
        <LoginForm />
      </section>
    </main>
  );
}
