import { useGetSettings, useUpdateSettings, useGetMe, useDeleteAccount } from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { useTranslation } from "@/lib/i18n";
import { LogOut, Trash2, Moon, Sun, Monitor, Palette, Globe, ChevronRight, Lock, Users, UserX, UserCheck, Smile, KeyRound, Flag, Mail, Copy, Check, X } from "lucide-react";
import { useState } from "react";
import { ReportDialog } from "@/components/report-dialog";

export default function Settings() {
  const { signOut } = useClerk();
  const { mode, setMode, accent, setAccent, language, setLanguage } = useTheme();
  const { t } = useTranslation();
  const { data: me } = useGetMe();
  const deleteMutation = useDeleteAccount();
  const [generalReportOpen, setGeneralReportOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const SUPPORT_EMAIL = "whitewaseofficial@gmail.com";

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(SUPPORT_EMAIL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLogout = () => signOut();

  const handleDelete = () => {
    if (confirm(t("settings_delete_confirm"))) {
      deleteMutation.mutate(undefined, {
        onSuccess: () => signOut()
      });
    }
  };

  return (
    <div className="w-full pb-8">
      <div className="p-6 pb-2 border-b border-border/50">
        <h1 className="text-2xl font-bold">{t("settings_title")}</h1>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Appearance Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">{t("settings_appearance")}</h2>
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-foreground">
                {mode === "dark" ? <Moon className="w-5 h-5 text-muted-foreground" /> : mode === "light" ? <Sun className="w-5 h-5 text-muted-foreground" /> : <Monitor className="w-5 h-5 text-muted-foreground" />}
                <span className="font-medium">{t("settings_theme")}</span>
              </div>
              <div className="flex bg-secondary rounded-lg p-1">
                {(["auto", "light", "dark"] as const).map((m) => (
                  <button
                    key={m}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${mode === m ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
                    onClick={() => setMode(m)}
                  >
                    {t(`settings_theme_${m}` as any)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-foreground">
                <Palette className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{t("settings_accent")}</span>
              </div>
              <div className="flex items-center gap-2">
                {["blue", "green", "purple", "brown", "black", "white"].map((color) => (
                  <button
                    key={color}
                    onClick={() => setAccent(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${accent === color ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ 
                      backgroundColor: color === "black" ? "#000" : color === "white" ? "#fff" : `var(--color-${color}-500, ${color})` 
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-foreground">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{t("settings_language")}</span>
              </div>
              <div className="flex bg-secondary rounded-lg p-1">
                <button
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${language === "en" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
                  onClick={() => setLanguage("en")}
                >
                  English
                </button>
                <button
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${language === "ar" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
                  onClick={() => setLanguage("ar")}
                >
                  العربية
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Account Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">{t("settings_account")}</h2>
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50">
            <Link href={me?.username ? `/profile/${me.username}` : "/profile/me"} className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <span className="font-medium">{t("settings_edit_profile")}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link href="/groups" className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{t("settings_groups")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link href={me?.username ? `/profile/${me.username}/followers` : "/followers"} className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{t("settings_my_followers")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link href={me?.username ? `/profile/${me.username}/following` : "/followers"} className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{t("settings_my_following")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link href="/settings/account" className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <KeyRound className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{t("settings_account_settings")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
        </section>

        {/* Privacy Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">{t("settings_privacy")}</h2>
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50">
            <Link href="/settings/private-posts" className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{t("settings_private_posts")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link href="/settings/blocked" className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <UserX className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{t("settings_blocked_users")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link href="/settings/emojis" className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <Smile className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{t("settings_emojis")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
        </section>

        {/* Support Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">{t("settings_support")}</h2>
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50">
            <button onClick={() => setContactOpen(true)} className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3 text-foreground">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{t("settings_contact_support")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => setGeneralReportOpen(true)} className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3 text-foreground">
                <Flag className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{t("settings_report_app")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </section>

        {/* Contact Support Overlay */}
        {contactOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setContactOpen(false)} />
            <div className="relative w-full max-w-lg bg-card rounded-t-3xl border border-border/50 border-b-0 shadow-2xl animate-in slide-in-from-bottom duration-300">

              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-3 pb-4">
                <h2 className="text-lg font-bold">{t("settings_contact_support_title")}</h2>
                <button onClick={() => setContactOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 pb-8 space-y-5">
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("settings_contact_support_desc")}
                </p>

                {/* Email Card */}
                <div className="bg-secondary/50 border border-border/50 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-accent" />
                    </div>
                    <span className="text-sm font-medium text-foreground truncate select-all">
                      whitewaseofficial@gmail.com
                    </span>
                  </div>
                  <button
                    onClick={handleCopyEmail}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      copied
                        ? "bg-green-500/15 text-green-500"
                        : "bg-accent/10 text-accent hover:bg-accent/20"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        {t("settings_contact_email_copied")}
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        {t("settings_contact_copy")}
                      </>
                    )}
                  </button>
                </div>

                {/* Steps */}
                <div className="space-y-2.5">
                  {[
                    t("settings_contact_support_step1"),
                    t("settings_contact_support_step2"),
                    t("settings_contact_support_step3"),
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-sm text-muted-foreground">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <section className="pt-4">
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50">
            <button onClick={handleLogout} className="w-full p-4 flex items-center gap-3 text-foreground hover:bg-secondary/50 transition-colors">
              <LogOut className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">{t("settings_sign_out")}</span>
            </button>
            <button onClick={handleDelete} className="w-full p-4 flex items-center gap-3 text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-5 h-5" />
              <span className="font-medium">{t("settings_delete_account")}</span>
            </button>
          </div>
        </section>

        <ReportDialog
          open={generalReportOpen}
          onOpenChange={setGeneralReportOpen}
          mode="general"
          targetType="user"
        />

        <div className="text-center pt-8 pb-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Silver Stream</p>
          <p className="text-accent font-semibold">V0.9</p>
          <p className="text-muted-foreground/70">Staff Edition</p>
          <p>Created by WhiteWase</p>
        </div>

      </div>
    </div>
  );
}
