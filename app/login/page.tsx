"use client";

import Image from "next/image";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const supabase = createClient();

    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        setLoading(true);
        setMessage("");

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                });


                if (error) {
                    throw error;
                }

                setMessage(
                    "Account created. Please check your email to confirm your account."
                );
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    throw error;
                }

                window.location.href = "/";
            }
        } catch (error) {
            console.error(error);

            if (error instanceof Error) {
                setMessage(error.message);
            } else {
                setMessage("Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 text-white">
            <div className="flex min-h-screen items-center justify-center px-6">
                <div className="w-full max-w-md">
                    <div className="mb-10 flex justify-center">
                        <Image
                            src="/ta27a.png"
                            alt="TA27A"
                            width={150}
                            height={55}
                            className="h-auto w-[150px] object-contain"
                            priority
                        />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 shadow-2xl">
                        <div className="mb-7 text-center">
                            <h1 className="text-2xl font-semibold">
                                {isSignUp ? "Create your account" : "Welcome back"}
                            </h1>

                            <p className="mt-2 text-sm text-slate-400">
                                {isSignUp
                                    ? "Create your TA27A account to get started."
                                    : "Sign in to continue to TA27A."}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="mb-2 block text-sm text-slate-300">
                                    Email
                                </label>

                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    disabled={loading}
                                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm text-slate-300">
                                    Password
                                </label>

                                <input
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    disabled={loading}
                                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-6 py-3 font-semibold transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loading
                                    ? "Please wait..."
                                    : isSignUp
                                        ? "Create account"
                                        : "Sign in"}
                            </button>
                        </form>

                        {message && (
                            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-slate-300">
                                {message}
                            </div>
                        )}

                        <div className="mt-6 text-center text-sm text-slate-400">
                            {isSignUp
                                ? "Already have an account?"
                                : "Don't have an account?"}

                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setMessage("");
                                }}
                                className="ml-2 font-medium text-cyan-400 hover:text-cyan-300"
                            >
                                {isSignUp ? "Sign in" : "Create account"}
                            </button>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-xs text-slate-600">
                        TA27A · Agent to Agent · AI Document Intelligence
                    </p>
                </div>
            </div>
        </main>
    );
}