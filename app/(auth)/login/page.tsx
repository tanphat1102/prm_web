"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

export default function LoginPage() {
  const router = useRouter();
  const {
    signIn,
    signInWithGoogle,
    sendPhoneVerificationCode,
    verifyPhoneCode,
  } = useFirebaseAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneStep, setPhoneStep] = useState<"input" | "verify">("input");

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Vui lòng nhập email");
      return;
    }

    if (!password || password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    try {
      setIsSubmitting(true);
      await signIn(email.trim(), password);
      router.push("/dashboard");
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Đăng nhập thất bại";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);

    try {
      setIsSubmitting(true);
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Đăng nhập Google thất bại";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePhoneSendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!phone.trim()) {
      setError("Vui lòng nhập số điện thoại");
      return;
    }

    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
      setError("Số điện thoại không hợp lệ (10-15 chữ số)");
      return;
    }

    try {
      setIsSubmitting(true);
      const formattedPhone = phone.trim().startsWith("+")
        ? phone.trim()
        : "+84" + phone.trim().substring(1);
      await sendPhoneVerificationCode(formattedPhone);
      setPhoneStep("verify");
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Gửi mã xác thực thất bại";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePhoneVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!verificationCode.trim()) {
      setError("Vui lòng nhập mã xác thực");
      return;
    }

    try {
      setIsSubmitting(true);
      await verifyPhoneCode(verificationCode.trim());
      router.push("/dashboard");
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Xác thực mã thất bại";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đăng nhập</CardTitle>
        <CardDescription>Chọn phương thức đăng nhập của bạn</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
        >
          <Chrome className="mr-2 h-4 w-4" />
          Đăng nhập bằng Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-background px-2 text-muted-foreground">
              Hoặc đăng nhập qua
            </span>
          </div>
        </div>

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="phone">Số điện thoại</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4">
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="your@email.com"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••"
                  autoComplete="current-password"
                />
              </div>

              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Đang đăng nhập...
                  </>
                ) : (
                  "Đăng nhập"
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="phone" className="space-y-4">
            {phoneStep === "input" ? (
              <form onSubmit={handlePhoneSendCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+84 xxx xxx xxx"
                    autoComplete="off"
                  />
                </div>

                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Đang gửi mã...
                    </>
                  ) : (
                    "Gửi mã xác thực"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handlePhoneVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label>Số điện thoại: {phone}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPhoneStep("input")}
                  >
                    Đổi số
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Mã xác thực SMS</Label>
                  <Input
                    id="code"
                    type="text"
                    value={verificationCode}
                    onChange={(event) =>
                      setVerificationCode(event.target.value)
                    }
                    placeholder="123456"
                    autoComplete="off"
                  />
                </div>

                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Đang xác thực...
                    </>
                  ) : (
                    "Xác thực"
                  )}
                </Button>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="justify-center text-sm text-muted-foreground">
        Chưa có tài khoản?&nbsp;
        <Link href="/register" className="text-primary hover:underline">
          Đăng ký
        </Link>
      </CardFooter>
    </Card>
  );
}
