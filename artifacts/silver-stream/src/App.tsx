import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { ClerkProvider, SignIn, SignUp, useClerk, useUser, useAuth } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useEffect, useRef, useState, useCallback } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { SplashScreen, useShouldShowSplash } from "@/components/splash-screen";
import { useGetMe, getGetMeQueryKey, setAuthTokenGetter } from "@workspace/api-client-react";

// Layouts
import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/top-bar";
import { SideNav } from "@/components/side-nav";
import { PageTransition } from "@/components/page-transition";

// Pages
import Feed from "@/pages/feed";
import Onboarding from "@/pages/onboarding";
import Landing from "@/pages/landing";
import Settings from "@/pages/settings";
import AccountSettings from "@/pages/account-settings";
import Profile from "@/pages/profile";
import Create from "@/pages/create";
import Search from "@/pages/search";
import SearchResults from "@/pages/search-results";
import Notifications from "@/pages/notifications";
import Videos from "@/pages/videos";
import Saved from "@/pages/saved";
import ChatList from "@/pages/chat";
import ChatDetail from "@/pages/chat-detail";
import Groups from "@/pages/groups";
import GroupDetail from "@/pages/group-detail";
import PrivatePosts from "@/pages/private-posts";
import PostDetail from "@/pages/post-detail";
import Followers from "@/pages/followers";
import Following from "@/pages/following";
import BlockedUsers from "@/pages/blocked-users";
import EmojiLibrary from "@/pages/emoji-library";

// REQUIRED — resolves the key from hostname so the same build serves multiple Clerk custom domains.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — empty in dev (intentional), auto-set in prod. Must be unconditional.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const { data: me } = useGetMe();
  return (
    <div className="min-h-[100dvh] w-full bg-background lg:flex lg:justify-center">
      <SideNav username={me?.username} />
      <div className="min-h-[100dvh] w-full max-w-md mx-auto lg:mx-0 lg:max-w-2xl bg-background relative flex flex-col sm:border-x sm:border-border sm:shadow-2xl lg:shadow-none lg:border-x lg:border-border/50">
        <TopBar />
        <main className="flex-1 pb-20 lg:pb-8 w-full overflow-x-hidden overflow-y-auto">
          {children}
        </main>
        <BottomNav username={me?.username} />
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: any }) {
  const { isLoaded, isSignedIn } = useUser();
  const { data: me, isLoading: meLoading } = useGetMe({
    query: { enabled: !!isSignedIn, retry: false, queryKey: getGetMeQueryKey() }
  });

  if (!isLoaded || (isSignedIn && meLoading)) return <div className="h-screen w-full bg-background" />;
  if (!isSignedIn) return <Redirect to="/" />;
  
  if (me && !me.onboardingComplete) {
    // If not on onboarding page, redirect there
    if (window.location.pathname !== `${basePath}/onboarding`) {
      return <Redirect to="/onboarding" />;
    }
  }

  return (
    <MainLayout>
      <PageTransition>
        <Component />
      </PageTransition>
    </MainLayout>
  );
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useUser();
  const { data: me, isLoading: meLoading } = useGetMe({
    query: { enabled: !!isSignedIn, retry: false, queryKey: getGetMeQueryKey() }
  });

  if (!isLoaded || (isSignedIn && meLoading)) return <div className="h-screen w-full bg-background" />;
  
  if (isSignedIn) {
    if (me && !me.onboardingComplete) return <Redirect to="/onboarding" />;
    return <Redirect to="/feed" />;
  }
  
  return <Landing />;
}

// يربط Clerk بالـ API client — يضع توكن Bearer في كل طلب
function ClerkAuthBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const clerkAppearance = {
    cssLayerName: "clerk",
    variables: {
      colorPrimary: "#1A1A1A",
      fontFamily: "Tajawal, Inter, sans-serif",
    },
    elements: {
      cardBox: "bg-card text-card-foreground border border-border shadow-xl rounded-2xl w-[440px] max-w-full silver-shimmer",
      card: "!bg-transparent",
      headerTitle: "text-foreground font-bold text-2xl",
      headerSubtitle: "text-muted-foreground",
      formFieldLabel: "text-foreground",
      formFieldInput: "bg-input text-foreground border-border",
      formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
      socialButtonsBlockButton: "border-border text-foreground hover:bg-secondary",
      socialButtonsBlockButtonText: "text-foreground font-medium",
      footerActionText: "text-muted-foreground",
      footerActionLink: "text-primary font-medium hover:underline",
      dividerText: "text-muted-foreground",
      dividerLine: "bg-border",
    }
  };

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkAuthBridge />
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?">
              <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
                <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
              </div>
            </Route>
            <Route path="/sign-up/*?">
              <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
                <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
              </div>
            </Route>
            <Route path="/onboarding" component={() => (
              <PageTransition><Onboarding /></PageTransition>
            )} />
            
            <Route path="/feed" component={() => <ProtectedRoute component={Feed} />} />
            <Route path="/videos" component={() => <ProtectedRoute component={Videos} />} />
            <Route path="/create" component={() => <ProtectedRoute component={Create} />} />
            <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
            <Route path="/settings/account" component={() => <ProtectedRoute component={AccountSettings} />} />
            <Route path="/search" component={() => <ProtectedRoute component={Search} />} />
            <Route path="/search/results" component={() => <ProtectedRoute component={SearchResults} />} />
            <Route path="/notifications" component={() => <ProtectedRoute component={Notifications} />} />
            <Route path="/profile/:username" component={() => <ProtectedRoute component={Profile} />} />
            <Route path="/saved" component={() => <ProtectedRoute component={Saved} />} />
            <Route path="/chat" component={() => <ProtectedRoute component={ChatList} />} />
            <Route path="/chat/:id" component={() => <ProtectedRoute component={ChatDetail} />} />
            <Route path="/groups" component={() => <ProtectedRoute component={Groups} />} />
            <Route path="/groups/:groupId" component={() => <ProtectedRoute component={GroupDetail} />} />
            <Route path="/settings/private-posts" component={() => <ProtectedRoute component={PrivatePosts} />} />
            <Route path="/settings/blocked" component={() => <ProtectedRoute component={BlockedUsers} />} />
            <Route path="/settings/emojis" component={() => <ProtectedRoute component={EmojiLibrary} />} />
            <Route path="/followers" component={() => <ProtectedRoute component={Followers} />} />
            <Route path="/profile/:username/followers" component={() => <ProtectedRoute component={Followers} />} />
            <Route path="/profile/:username/following" component={() => <ProtectedRoute component={Following} />} />
            <Route path="/post/:id" component={() => <ProtectedRoute component={PostDetail} />} />
            
            <Route>
              <div className="flex min-h-[100dvh] items-center justify-center text-muted-foreground">
                Page Not Found
              </div>
            </Route>
          </Switch>
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  const shouldShow = useShouldShowSplash();
  const [splashDone, setSplashDone] = useState(!shouldShow);
  const handleSplashDone = useCallback(() => setSplashDone(true), []);

  return (
    <>
      {!splashDone && <SplashScreen onDone={handleSplashDone} />}
      <div style={{ opacity: splashDone ? 1 : 0, transition: "opacity 0.4s ease" }}>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
      </div>
    </>
  );
}

export default App;
