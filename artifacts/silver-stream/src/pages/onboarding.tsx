import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCheckUsername, useCompleteOnboarding, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useDebounce } from "@/lib/use-debounce"; // Will create this utility

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const debouncedUsername = useDebounce(username, 300);
  
  const { data: checkResult, isLoading: isChecking } = useCheckUsername(
    { username: debouncedUsername },
    { query: { enabled: debouncedUsername.length > 2, queryKey: ["checkUsername", debouncedUsername] } }
  );

  const queryClient = useQueryClient();
  const completeMutation = useCompleteOnboarding();

  const isAvailable = checkResult?.available;
  const showAvailability = debouncedUsername.length > 2 && !isChecking;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAvailable || !acceptedTerms || username.length < 3) return;

    completeMutation.mutate(
      { data: { username, displayName, acceptedTerms } },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setLocation("/feed");
        }
      }
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background max-w-md mx-auto relative px-6 py-12">
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-3xl font-bold mb-2">Welcome to Silver Stream</h1>
        <p className="text-muted-foreground mb-8">Let's set up your profile to get started.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Username *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input 
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="pl-8 h-12 rounded-xl"
                placeholder="username"
                required
              />
            </div>
            {showAvailability && (
              <p className={`text-xs ${isAvailable ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                {isAvailable ? "Username is available!" : "Username is taken."}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Display Name</label>
            <Input 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-12 rounded-xl"
              placeholder="How should we call you?"
            />
          </div>

          <div className="p-4 bg-secondary/30 rounded-xl border border-border/50 text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Silver Stream — Terms of Service & Privacy Policy</p>
            <p>This platform is owned and operated by WhiteWase. YouTube: https://youtube.com/@whitewase?si=33-wgad8O3-VSyd-</p>
            <p>By using Silver Stream, you agree to: 1. Not post harmful content. 2. Respect others' privacy. 3. Content visibility depends on your settings. 4. We do not sell your data. 5. You may delete your account from settings.</p>
            <p>(Beta Version — Features may change.)</p>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox 
              id="terms" 
              checked={acceptedTerms} 
              onCheckedChange={(c) => setAcceptedTerms(c as boolean)} 
              className="mt-1"
            />
            <label htmlFor="terms" className="text-sm text-foreground leading-tight cursor-pointer">
              I agree to the Terms of Service and Privacy Policy
            </label>
          </div>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full h-14 rounded-xl mt-8"
            disabled={!isAvailable || !acceptedTerms || completeMutation.isPending || username.length < 3}
          >
            {completeMutation.isPending ? "Setting up..." : "Complete Setup"}
          </Button>
        </form>
      </div>
    </div>
  );
}
