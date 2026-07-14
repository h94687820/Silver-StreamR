import { useGetSettings, useUpdateSettings, useGetMe, useDeleteAccount } from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import { LogOut, Trash2, Moon, Sun, Monitor, Palette, Globe, ChevronRight, Lock, Users } from "lucide-react";

export default function Settings() {
  const { signOut } = useClerk();
  const { mode, setMode, accent, setAccent, language, setLanguage } = useTheme();
  const { data: me } = useGetMe();
  const deleteMutation = useDeleteAccount();

  const handleLogout = () => signOut();

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      deleteMutation.mutate(undefined, {
        onSuccess: () => signOut()
      });
    }
  };

  return (
    <div className="w-full pb-8">
      <div className="p-6 pb-2 border-b border-border/50">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Theme Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">Appearance</h2>
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-foreground">
                {mode === "dark" ? <Moon className="w-5 h-5 text-muted-foreground" /> : mode === "light" ? <Sun className="w-5 h-5 text-muted-foreground" /> : <Monitor className="w-5 h-5 text-muted-foreground" />}
                <span className="font-medium">Theme Mode</span>
              </div>
              <div className="flex bg-secondary rounded-lg p-1">
                {["auto", "light", "dark"].map((m) => (
                  <button
                    key={m}
                    className={`px-3 py-1 text-xs rounded-md capitalize font-medium transition-colors ${mode === m ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
                    onClick={() => setMode(m as any)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-foreground">
                <Palette className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Accent Color</span>
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
                <span className="font-medium">Language</span>
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
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">Account</h2>
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50">
            <Link href={me?.username ? `/profile/${me.username}` : "/profile/me"} className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <span className="font-medium">Edit Profile</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link href="/groups" className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Groups</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
        </section>

        {/* Privacy Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">Privacy</h2>
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50">
            <Link href="/settings/private-posts" className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Private Posts</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="pt-4">
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50">
            <button onClick={handleLogout} className="w-full p-4 flex items-center gap-3 text-foreground hover:bg-secondary/50 transition-colors">
              <LogOut className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">Sign Out</span>
            </button>
            <button onClick={handleDelete} className="w-full p-4 flex items-center gap-3 text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-5 h-5" />
              <span className="font-medium">Delete Account</span>
            </button>
          </div>
        </section>

        <div className="text-center pt-8 pb-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Silver Stream</p>
          <p className="text-accent font-semibold">V0.2.1 Beta</p>
          <p>Created by WhiteWase</p>
        </div>

      </div>
    </div>
  );
}
