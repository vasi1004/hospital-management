import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { AppLogo } from "@/components/AppLogo";
import { BackendLoader } from "@/components/BackendLoader";
import { RoleLayout } from "@/layouts/RoleLayout";
import { useAppSelector } from "@/store/hooks";
import { ADMIN_NAV, RECEPTION_NAV } from "@/constants/nav";
import {
  getPrescriptionsBasePath,
  ROLES,
} from "@/constants/roles";
import { APP_NAME } from "@/constants/urls";
import {
  fetchPrescriptionPdfBlob,
  getPrescriptionRequest,
} from "@/services/hmsApi";
import "@/pages/doctor/PrescriptionCard.css";

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Read-only prescription card for admin / receptionist.
 * All clinical fields come from the prescriptions API — nothing hardcoded.
 */
export function StaffPrescriptionDetailPage() {
  const { prescriptionId } = useParams();
  const { user, accessToken } = useAppSelector((state) => state.auth);

  const [rx, setRx] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [pdfPreviewError, setPdfPreviewError] = useState(null);

  const navItems =
    user?.role === ROLES.ADMIN
      ? ADMIN_NAV
      : user?.role === ROLES.RECEPTIONIST
        ? RECEPTION_NAV
        : [];
  const basePath = getPrescriptionsBasePath(user?.role);

  useEffect(() => {
    if (!accessToken || !prescriptionId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getPrescriptionRequest(accessToken, prescriptionId);
        if (!cancelled) setRx(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load prescription",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, prescriptionId]);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  if (!user) return <Navigate to="/login" replace />;
  if (![ROLES.ADMIN, ROLES.RECEPTIONIST].includes(user.role) || !basePath) {
    return <Navigate to="/login" replace />;
  }

  function closePdfPreview() {
    setPdfPreviewOpen(false);
    setPdfPreviewError(null);
    setPdfPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  async function handleViewPdf() {
    if (!accessToken || !rx?.id) return;
    setPdfBusy(true);
    setPdfPreviewError(null);
    setPdfPreviewOpen(true);
    try {
      const { blob } = await fetchPrescriptionPdfBlob(accessToken, rx.id, "inline");
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err) {
      setPdfPreviewError(
        err instanceof Error ? err.message : "Unable to preview PDF",
      );
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleDownloadPdf() {
    if (!accessToken || !rx?.id) return;
    setPdfBusy(true);
    setError(null);
    try {
      const { blob, filename } = await fetchPrescriptionPdfBlob(
        accessToken,
        rx.id,
        "attachment",
      );
      triggerBlobDownload(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download PDF");
    } finally {
      setPdfBusy(false);
    }
  }

  const items = rx?.items || [];

  return (
    <RoleLayout
      user={user}
      subtitle={user.role === ROLES.ADMIN ? "Admin console" : "Front desk"}
      navItems={navItems}
      title="Prescription details"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <Link to={basePath} className="ui-btn ui-btn-ghost">
          Back to prescriptions
        </Link>
      </div>

      {error ? (
        <p className="ui-alert-error mb-3" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <BackendLoader variant="inline" label="Loading prescription…" />
      ) : null}

      {!loading && rx ? (
        <div className="rx-layout">
          <article className="rx-card" aria-label="Digital prescription">
            <header className="rx-card__header">
              <div className="rx-card__brand">
                <AppLogo
                  variant="mark"
                  tone="onLight"
                  effect3d
                  className="rx-card__logo"
                  decorative
                />
                <div>
                  <p className="rx-card__clinic">{APP_NAME}</p>
                  <h2 className="rx-card__title">Prescription</h2>
                </div>
              </div>
              <div className="rx-card__meta">
                <p>
                  <strong>Rx #</strong> {rx.prescription_code}
                </p>
                <p>
                  <strong>Date</strong> {rx.prescribed_on}
                </p>
                {rx.appointment_code ? (
                  <p>
                    <strong>Visit</strong> {rx.appointment_code}
                  </p>
                ) : null}
              </div>
            </header>

            <section className="rx-card__parties">
              <div>
                <p className="rx-label">Doctor</p>
                <p className="rx-value">{rx.doctor_name || "—"}</p>
                <p className="rx-sub">{rx.doctor_specialization || "—"}</p>
              </div>
              <div>
                <p className="rx-label">Patient</p>
                <p className="rx-value">{rx.patient_name || "—"}</p>
                <p className="rx-sub">{rx.patient_code || "—"}</p>
              </div>
            </section>

            <div className="rx-field">
              <span className="rx-label">Diagnosis</span>
              <p className="rx-value">{rx.diagnosis || "—"}</p>
            </div>

            <div className="rx-meds">
              <div className="rx-meds__head">
                <span>Medicine</span>
                <span>Dose</span>
                <span>Frequency</span>
                <span>Duration</span>
                <span>Notes</span>
              </div>
              {items.length === 0 ? (
                <div className="rx-meds__row">
                  <span className="ui-muted">No medicines listed</span>
                </div>
              ) : (
                items.map((item, index) => (
                  <div className="rx-meds__row" key={`${item.id || index}`}>
                    <span>{item.medicine_name}</span>
                    <span>{item.dose}</span>
                    <span>{item.frequency}</span>
                    <span>{item.duration}</span>
                    <span>{item.instructions || "—"}</span>
                  </div>
                ))
              )}
            </div>

            <div className="rx-field mt-4">
              <span className="rx-label">Advice</span>
              <p className="rx-value">{rx.advice || "—"}</p>
            </div>

            <div className="rx-field">
              <span className="rx-label">Clinical notes</span>
              <p className="rx-value">{rx.notes || "—"}</p>
            </div>

            <footer className="rx-card__footer">
              <p>Digitally signed by {rx.doctor_name || "doctor"}</p>
              <p className="rx-script">℞</p>
            </footer>
          </article>

          <div className="rx-actions">
            <button
              type="button"
              className="ui-btn ui-btn-ghost"
              onClick={handleViewPdf}
              disabled={pdfBusy || !rx.id}
            >
              {pdfBusy && pdfPreviewOpen ? "Loading PDF…" : "View PDF"}
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-primary"
              onClick={handleDownloadPdf}
              disabled={pdfBusy || !rx.id}
            >
              Download PDF
            </button>
          </div>
        </div>
      ) : null}

      {pdfPreviewOpen ? (
        <div
          className="rx-pdf-backdrop"
          role="presentation"
          onClick={closePdfPreview}
        >
          <div
            className="rx-pdf-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-rx-pdf-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="rx-pdf-modal__head">
              <h2 id="staff-rx-pdf-title" className="rx-pdf-modal__title">
                Prescription PDF
                {rx?.prescription_code ? ` · ${rx.prescription_code}` : ""}
              </h2>
              <div className="rx-pdf-modal__actions">
                <button
                  type="button"
                  className="ui-btn ui-btn-primary"
                  onClick={handleDownloadPdf}
                  disabled={pdfBusy || !rx?.id}
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-ghost"
                  onClick={closePdfPreview}
                >
                  Close
                </button>
              </div>
            </header>
            {pdfPreviewError ? (
              <p className="ui-alert-error rx-pdf-modal__status" role="alert">
                {pdfPreviewError}
              </p>
            ) : null}
            {!pdfPreviewError && !pdfPreviewUrl ? (
              <BackendLoader variant="compact" label="Loading preview…" />
            ) : null}
            {pdfPreviewUrl ? (
              <iframe
                className="rx-pdf-modal__frame"
                title="Prescription PDF preview"
                src={pdfPreviewUrl}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </RoleLayout>
  );
}
