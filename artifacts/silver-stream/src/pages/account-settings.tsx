import { useState } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { ArrowLeft, Loader2, Mail, KeyRound, CheckCircle2 } from "lucide-react";

export default function AccountSettings() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { user, isLoaded } = useUser();

  // Email change flow
  const [newEmail, setNewEmail] = useState("");
  const [pendingEmailId, setPendingEmailId] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState("");
  const [emailStep, setEmailStep] = useState<"idle" | "verify">("idle");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Password change flow
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  if (!isLoaded || !user) {
    return <div className="p-6 text-muted-foreground">{t("loading")}</div>;
  }

  const currentEmail = user.primaryEmailAddress?.emailAddress || "";
  const hasPassword = user.passwordEnabled;

  const handleSendCode = async () => {
    setEmailError(null);
    setEmailSuccess(false);
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError(t("account_email_invalid"));
      return;
    }
    if (trimmed === currentEmail.toLowerCase()) {
      setEmailError(t("account_email_same"));
      return;
    }
    setEmailLoading(true);
    try {
      const emailAddress = await user.createEmailAddress({ email: trimmed });
      await emailAddress.prepareVerification({ strategy: "email_code" });
      setPendingEmailId(emailAddress.id);
      setEmailStep("verify");
    } catch (e: any) {
      setEmailError(e?.errors?.[0]?.longMessage || e?.message || t("account_email_error"));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setEmailError(null);
    if (!pendingEmailId) return;
    setEmailLoading(true);
    try {
      const pending = user.emailAddresses.find((e) => e.id === pendingEmailId);
      if (!pending) throw new Error(t("account_email_error"));
      const verified = await pending.attemptVerification({ code: emailCode.trim() });

      await user.update({ primaryEmailAddressId: verified.id });

      // Clean up the old email address(es) now that the new one is primary.
      const stale = user.emailAddresses.filter((e) => e.id !== verified.id);
      await Promise.all(stale.map((e) => e.destroy().catch(() => {})));

      await user.reload();

      setEmailSuccess(true);
      setEmailStep("idle");
      setNewEmail("");
      setEmailCode("");
      setPendingEmailId(null);
    } catch (e: any) {
      setEmailError(e?.errors?.[0]?.longMessage || e?.message || t("account_email_error"));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleCancelEmailChange = async () => {
    if (pendingEmailId) {
      const pending = user.emailAddresses.find((e) => e.id === pendingEmailId);
      await pending?.destroy().catch(() => {});
    }
    setEmailStep("idle");
    setNewEmail("");
    setEmailCode("");
    setPendingEmailId(null);
    setEmailError(null);
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (hasPassword && !currentPassword) {
      setPasswordError(t("account_password_current_required"));
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(t("account_password_too_short"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("account_password_mismatch"));
      return;
    }

    setPasswordLoading(true);
    try {
      await user.updatePassword({
        newPassword,
        ...(hasPassword ? { currentPassword } : {}),
      });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      setPasswordError(e?.errors?.[0]?.longMessage || e?.message || t("account_password_error"));
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="w-full pb-8">
      <div className="p-6 pb-2 border-b border-border/50 flex items-center gap-3">
        <button onClick={() => setLocation("/settings")} className="p-1 -ml-1 rounded-full hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">{t("account_settings_title")}</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Email Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">{t("account_email_section")}</h2>
          <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="font-medium">{currentEmail}</span>
            </div>

            {emailStep === "idle" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("account_email_new_label")}</label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-11 rounded-xl"
                  disabled={emailLoading}
                />
                {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                {emailSuccess && (
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> {t("account_email_success")}
                  </p>
                )}
                <Button onClick={handleSendCode} disabled={emailLoading || !newEmail} className="rounded-xl w-full">
                  {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("account_email_send_code")}
                </Button>
              </div>
            )}

            {emailStep === "verify" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t("account_email_code_sent")} {newEmail}</p>
                <label className="text-sm font-medium">{t("account_email_code_label")}</label>
                <Input
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="h-11 rounded-xl tracking-widest text-center"
                  disabled={emailLoading}
                  maxLength={6}
                />
                {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancelEmailChange} disabled={emailLoading} className="rounded-xl flex-1">
                    {t("account_cancel")}
                  </Button>
                  <Button onClick={handleVerifyCode} disabled={emailLoading || emailCode.length < 6} className="rounded-xl flex-1">
                    {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("account_email_verify")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Password Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">{t("account_password_section")}</h2>
          <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="font-medium">{hasPassword ? t("account_password_set") : t("account_password_not_set")}</span>
            </div>

            {hasPassword && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("account_password_current_label")}</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-11 rounded-xl"
                  disabled={passwordLoading}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("account_password_new_label")}</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 rounded-xl"
                disabled={passwordLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("account_password_confirm_label")}</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 rounded-xl"
                disabled={passwordLoading}
              />
            </div>

            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            {passwordSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> {t("account_password_success")}
              </p>
            )}

            <Button onClick={handleChangePassword} disabled={passwordLoading || !newPassword || !confirmPassword} className="rounded-xl w-full">
              {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("account_password_save")}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
