"use client";

import { useState, useEffect } from "react";
import { LifeBuoy, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { BrandLogo, ProjectName } from "@/components/shared/branding-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "register";
}

export function AuthDialog({
  open,
  onOpenChange,
  defaultTab = "login",
}: AuthDialogProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
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

      if (data.session) {
        window.location.href = data.redirectPath || "/dashboard";
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
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) {
          setErrorMsg(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background/95 dark:bg-card/95 backdrop-blur-xl border-border shadow-2xl">
        <DialogHeader className="text-center pt-6 pb-2 px-6">
          <BrandLogo
            className="mx-auto size-11 rounded-2xl mb-2 ring-1 ring-border/50"
            fallback={<LifeBuoy className="size-5" />}
          />
          <DialogTitle className="text-xl font-bold tracking-tight text-center">
            Welcome to <ProjectName />
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground text-center">
            Sign in or create a client account to access the ticket portal
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 pt-2">
          {errorMsg && (
            <Alert variant="destructive" className="py-2.5 mb-4 text-xs">
              <AlertCircle className="size-4" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val);
              setErrorMsg(null);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* SIGN IN TAB */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="popup-login-email" className="text-xs">
                    Email Address
                  </Label>
                  <Input
                    id="popup-login-email"
                    type="email"
                    placeholder="name@company.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <Label htmlFor="popup-login-password" className="text-xs">
                    Password
                  </Label>
                  <Input
                    id="popup-login-password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <Checkbox
                    id="popup-login-remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                  />
                  <Label
                    htmlFor="popup-login-remember"
                    className="text-xs text-muted-foreground font-normal cursor-pointer select-none hover:text-foreground"
                  >
                    Remember me
                  </Label>
                </div>

                <Button type="submit" className="w-full mt-4 h-9 text-xs font-semibold" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-2" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="size-3.5 ml-1.5" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* REGISTER TAB */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="popup-reg-name" className="text-xs">
                    Full Name
                  </Label>
                  <Input
                    id="popup-reg-name"
                    type="text"
                    placeholder="Jane Doe"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <Label htmlFor="popup-reg-email" className="text-xs">
                    Email Address
                  </Label>
                  <Input
                    id="popup-reg-email"
                    type="email"
                    placeholder="name@company.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <Label htmlFor="popup-reg-password" className="text-xs">
                    Password
                  </Label>
                  <Input
                    id="popup-reg-password"
                    type="password"
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <Button type="submit" className="w-full mt-4 h-9 text-xs font-semibold" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-2" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Client Account
                      <ArrowRight className="size-3.5 ml-1.5" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
