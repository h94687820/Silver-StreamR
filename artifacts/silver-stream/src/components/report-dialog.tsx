import { useState, useRef } from "react";
import { Flag, Upload, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadFileAndGetUrl } from "@/lib/upload";
import { getAuthToken } from "@workspace/api-client-react";
import { useTranslation } from "@/lib/i18n";

export type ReportMode = "general" | "specific";
export type ReportTargetType = "post" | "comment" | "user" | "group" | "story";

const GENERAL_TYPES = [
  { value: "performance", labelEn: "Performance Issues", labelAr: "مشاكل الأداء" },
  { value: "technical", labelEn: "Technical Issues", labelAr: "مشاكل تقنية" },
  { value: "compatibility", labelEn: "Compatibility Issues", labelAr: "مشاكل التوافق" },
  { value: "other", labelEn: "Other", labelAr: "مشاكل أخرى" },
] as const;

const SPECIFIC_TYPES = [
  { value: "inappropriate_content", labelEn: "Inappropriate Content", labelAr: "محتوى غير مناسب" },
  { value: "community_violation", labelEn: "Community Violation", labelAr: "محتوى مخل بالمجتمع" },
  { value: "offensive_language", labelEn: "Offensive Language", labelAr: "محتوى فيه ألفاظ نابية" },
  { value: "abusive", labelEn: "Abusive Content", labelAr: "محتوى يسيء" },
  { value: "bullying", labelEn: "Bullying", labelAr: "تنمر" },
  { value: "impersonation", labelEn: "Impersonation", labelAr: "انتحال شخصية" },
  { value: "stolen_content", labelEn: "Stolen Content", labelAr: "سرقة منشورات" },
  { value: "misleading", labelEn: "Misleading Content", labelAr: "محتوى مضلل" },
] as const;

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ReportMode;
  targetType?: ReportTargetType;
  targetId?: string;
  targetUsername?: string;
}

export function ReportDialog({
  open,
  onOpenChange,
  mode,
  targetType = "user",
  targetId = "",
  targetUsername: initialUsername = "",
}: ReportDialogProps) {
  const { t, lang } = useTranslation();
  const isAr = lang === "ar";

  const [reportType, setReportType] = useState("");
  const [description, setDescription] = useState("");
  const [username, setUsername] = useState(initialUsername);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const types = mode === "general" ? GENERAL_TYPES : SPECIFIC_TYPES;

  const reset = () => {
    setReportType("");
    setDescription("");
    setUsername(initialUsername);
    setScreenshot(null);
    setScreenshotPreview(null);
    setStatus("idle");
    setErrorMsg("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      setErrorMsg(isAr ? "الوصف مطلوب" : "Description is required");
      return;
    }
    if (!reportType) {
      setErrorMsg(isAr ? "يرجى اختيار نوع البلاغ" : "Please select a report type");
      return;
    }
    if (mode === "specific" && !username.trim()) {
      setErrorMsg(isAr ? "اسم المستخدم مطلوب للبلاغات الخاصة" : "Username is required for specific reports");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      let screenshotUrl: string | undefined;
      if (screenshot) {
        screenshotUrl = await uploadFileAndGetUrl(screenshot);
      }

      const token = await getAuthToken();
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          mode,
          targetType,
          targetId,
          targetUsername: username.trim() || undefined,
          reportType,
          description: description.trim(),
          screenshotUrl,
        }),
      });

      if (!res.ok) {
        throw new Error(isAr ? "فشل الإرسال" : "Failed to submit report");
      }

      setStatus("success");
      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 2000);
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || (isAr ? "حدث خطأ، حاول مرة أخرى" : "An error occurred, please try again"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto pb-safe">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-start">
            <Flag className="w-5 h-5 text-destructive" />
            {mode === "general"
              ? (isAr ? "الإبلاغ عن مشكلة عامة" : "Report a General Issue")
              : (isAr ? "الإبلاغ عن محتوى مخالف" : "Report Inappropriate Content")}
          </SheetTitle>
        </SheetHeader>

        {status === "success" ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <p className="font-semibold text-lg">{isAr ? "تم إرسال البلاغ" : "Report Submitted"}</p>
            <p className="text-sm text-muted-foreground">
              {isAr ? "شكراً لمساعدتنا في تحسين المنصة" : "Thank you for helping us improve the platform"}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Report Type */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                {isAr ? "نوع البلاغ" : "Report Type"} <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {types.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setReportType(type.value)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium border text-start transition-all ${
                      reportType === type.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {isAr ? type.labelAr : type.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                {isAr ? "الوصف" : "Description"} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isAr ? "اشرح المشكلة بالتفصيل…" : "Describe the issue in detail…"}
                className="resize-none rounded-xl min-h-[100px]"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-end">{description.length}/1000</p>
            </div>

            {/* Target Username */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                {isAr ? "اسم المستخدم المُبلَّغ عنه" : "Reported Username"}
                {mode === "specific" && <span className="text-destructive"> *</span>}
                {mode === "general" && (
                  <span className="text-muted-foreground font-normal ms-1">
                    ({isAr ? "اختياري" : "optional"})
                  </span>
                )}
              </Label>
              <div className="relative">
                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isAr ? "اسم المستخدم" : "username"}
                  className="rounded-xl ps-8"
                />
              </div>
            </div>

            {/* Screenshot */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                {isAr ? "صورة توضيحية" : "Screenshot"}
                <span className="text-muted-foreground font-normal ms-1">
                  ({isAr ? "اختياري" : "optional"})
                </span>
              </Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {screenshotPreview ? (
                <div className="relative inline-block">
                  <img
                    src={screenshotPreview}
                    alt="screenshot"
                    className="w-32 h-24 object-cover rounded-xl border border-border"
                  />
                  <button
                    onClick={handleRemoveScreenshot}
                    className="absolute -top-2 -end-2 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border hover:border-primary/50 text-sm text-muted-foreground hover:text-foreground transition-all w-full justify-center"
                >
                  <Upload className="w-4 h-4" />
                  {isAr ? "ارفع صورة" : "Upload Image"}
                </button>
              )}
            </div>

            {/* Error */}
            {(errorMsg || status === "error") && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg || (isAr ? "حدث خطأ" : "An error occurred")}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2 pb-4">
              <Button variant="outline" onClick={handleClose} className="flex-1 rounded-xl">
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {loading
                  ? (isAr ? "جارٍ الإرسال…" : "Submitting…")
                  : (isAr ? "إرسال البلاغ" : "Submit Report")}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
