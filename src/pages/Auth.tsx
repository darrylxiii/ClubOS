import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Lock, CheckCircle2 } from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AssistedPasswordConfirmation } from "@/components/ui/assisted-password-confirmation";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { OAuthDiagnostics } from "@/components/OAuthDiagnostics";

const quantumLogo = "/quantum-logo.svg?v=2";
const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(12, "Password must be at least 12 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[0-9]/, "Password must contain at least one number").regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const Auth = () => {
  const { user, loading, session } = useAuth();
  const { resolvedTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("invite");
  const prefillEmail = searchParams.get("email");
  const [isLogin, setIsLogin] = useState(!inviteCode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [needsEmailVerification, setNeedsEmailVerification]
