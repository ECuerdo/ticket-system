"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LifeBuoy, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { BrandLogo, ProjectName } from "@/components/shared/branding-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AuthForm() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("remembered_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // LocalStorage access catch
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log in.");
      }

      try {
        if (rememberMe) {
          localStorage.setItem("remembered_email", email.trim());
        } else {
          localStorage.removeItem("remembered_email");
        }
      } catch {
        // LocalStorage catch
      }

      const targetPath = data.redirectPath || "/dashboard";
      window.location.href = targetPath;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, role: "CLIENT" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register.");
      }

      // Automatically sign in or notify
      if (data.session) {
        window.location.href = data.redirectPath || "/client";
      } else {
        setErrorMsg(null);
        alert("Registration successful! You can now sign in.");
        setActiveTab("login");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-border/80 shadow-2xl backdrop-blur-md">
      <CardHeader className="text-center space-y-2 pb-4">
        <BrandLogo
          className="mx-auto size-12 rounded-2xl"
          fallback={<LifeBuoy className="size-6" />}
        />
        <CardTitle className="text-2xl font-bold tracking-tight">
          Welcome to <ProjectName />
        </CardTitle>
        <CardDescription>
          Sign in or create an account to access your role workspace
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMsg && (
          <Alert variant="destructive" className="py-2.5">
            <AlertCircle className="size-4" />
            <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
          </Alert>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val as string);
            setErrorMsg(null);
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          {/* SIGN IN TAB */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-3.5 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email Address</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="name@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Password</Label>
                </div>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <Checkbox
                  id="login-remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                />
                <Label
                  htmlFor="login-remember"
                  className="text-xs text-muted-foreground font-normal cursor-pointer select-none hover:text-foreground"
                >
                  Remember me
                </Label>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="size-4 ml-1.5" />
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          {/* REGISTER TAB */}
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-3.5 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="reg-name">Full Name</Label>
                <Input
                  id="reg-name"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-email">Email Address</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="name@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-password">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="size-4 ml-1.5" />
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-center border-t border-border/60 bg-muted/20 py-3 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          &larr; Back to Landing Page
        </Link>
      </CardFooter>
    </Card>
  );
}

