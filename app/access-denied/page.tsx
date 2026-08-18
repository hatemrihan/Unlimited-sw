import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Access Denied",
    // A permission error is never something search engines should index.
    robots: { index: false, follow: false },
};

export default function AccessDeniedPage() {
    return (
        <main className="min-h-[100dvh] bg-stone-900 flex flex-col items-center justify-center p-6 text-white font-sans relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-lg relative z-10 text-center space-y-8">
                {/* Warning Icon */}
                <div className="w-24 h-24 mx-auto bg-white/[0.03] border border-white/[0.08] rounded-2xl flex items-center justify-center animate-pulse motion-reduce:animate-none">
                    <svg aria-hidden="true" className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#EFEFEF]">
                        Access Denied
                    </h1>
                    <p className="text-[#888] text-sm md:text-base max-w-md mx-auto leading-relaxed uppercase tracking-widest font-light">
                        This email is not authorized for administrative access to Unlimited.
                    </p>
                </div>

                <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/"
                        className="w-full sm:w-auto inline-flex items-center justify-center px-8 h-12 bg-white text-stone-950 text-xs uppercase tracking-widest font-bold rounded-lg hover:bg-[#EFEFEF] transition-all active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
                    >
                        Return Home
                    </Link>
                    <Link
                        href="/admin/login"
                        className="w-full sm:w-auto inline-flex items-center justify-center px-8 h-12 bg-transparent border border-white/10 text-white text-xs uppercase tracking-widest font-bold rounded-lg hover:bg-white/5 transition-all active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
                    >
                        Try Another Account
                    </Link>
                </div>

                {/* Footer Message */}
                <div className="pt-12 text-[#444] text-[10px] uppercase tracking-[0.3em] font-light">
                    Unlimited Authorized Personnel Only
                </div>
            </div>
        </main>
    );
}
