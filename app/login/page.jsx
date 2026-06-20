"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("flow", "signIn");
      await signIn("password", formData);
      router.push("/dashboard");
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setError("Google sign-in needs Google OAuth credentials configured in Convex first.");
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link href="/register" className="text-[#cc785c] font-medium hover:underline underline-offset-4">
            Create one
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="mb-6 h-12 w-full rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] text-sm font-medium text-[#141413] shadow-none hover:bg-[#efe9de]"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#e6dfd8]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#faf9f5] px-3 text-[#8e8b82]">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[8px] border border-[#e9c4bb] bg-[#f7e7e3] p-3 text-sm text-[#a33d32]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-[#252523]">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8b82]" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] pl-10 text-[#141413] shadow-none placeholder:text-[#8e8b82] focus-visible:ring-[#cc785c]"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-[#252523]">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-[#cc785c] hover:underline underline-offset-4">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8b82]" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] pl-10 text-[#141413] shadow-none placeholder:text-[#8e8b82] focus-visible:ring-[#cc785c]"
              required
            />
          </div>
        </div>
        <Button type="submit" className="h-12 w-full rounded-[8px] bg-[#cc785c] font-medium text-white shadow-none hover:bg-[#a9583e]" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
