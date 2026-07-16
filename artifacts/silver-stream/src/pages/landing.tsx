import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      {/* Decorative Silver Orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-gray-200 to-gray-400 opacity-20 dark:from-gray-700 dark:to-gray-900 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tr from-gray-300 to-white opacity-20 dark:from-gray-800 dark:to-black rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="w-24 h-24 bg-gradient-to-tr from-gray-200 via-white to-gray-300 dark:from-gray-700 dark:via-gray-600 dark:to-gray-800 rounded-[2rem] shadow-2xl flex items-center justify-center mb-8 rotate-12 transition-transform hover:rotate-0 duration-500 silver-shimmer">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-center mb-6 bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground/80 to-muted-foreground">
          Silver Stream
        </h1>
        
        <p className="text-lg sm:text-xl text-center text-muted-foreground mb-12 max-w-md">
          مساحة رقمية أنيقة ومتميزة. تواصل، شارك، واكتشف في بيئة متقنة.
        </p>

        <div className="flex flex-col w-full max-w-xs gap-4">
          <Link href="/sign-in">
            <Button size="lg" className="w-full text-base h-14 rounded-xl shadow-xl hover:shadow-2xl transition-all silver-shimmer">
              تسجيل الدخول / Sign In
            </Button>
          </Link>
        </div>

        <p className="mt-8 text-xs text-muted-foreground/60">
          V0.5.1 Beta Gold Edition
        </p>
      </main>
    </div>
  );
}
