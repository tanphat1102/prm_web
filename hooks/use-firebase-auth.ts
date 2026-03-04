"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged,
  type User,
  type ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { authController } from "@/lib/services/auth-controller";
import { saveAuthTokens, clearAuthTokens } from "@/lib/services/token-storage";

const googleProvider = new GoogleAuthProvider();

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [phoneConfirmation, setPhoneConfirmation] =
    useState<ConfirmationResult | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        clearAuthTokens();
        setFirebaseLoading(false);
        return;
      }

      // Skip token exchange if we're already authenticating (to avoid double calls)
      if (isAuthenticating) {
        setFirebaseLoading(false);
        return;
      }

      const idToken = await currentUser.getIdToken();

      try {
        const response = await authController.login({ idToken });
        if (response.data?.accessToken && response.data?.refreshToken) {
          saveAuthTokens(response.data.accessToken, response.data.refreshToken);
        } else {
          console.error("Invalid response format:", response);
          clearAuthTokens();
        }
      } catch (error) {
        console.error("Failed to exchange Firebase token:", error);
        clearAuthTokens();
      }

      setFirebaseLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticating]);

  async function signUp(email: string, password: string) {
    try {
      setIsAuthenticating(true);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const idToken = await userCredential.user.getIdToken();

      const response = await authController.login({ idToken });
      if (response.data?.accessToken && response.data?.refreshToken) {
        saveAuthTokens(response.data.accessToken, response.data.refreshToken);
      } else {
        throw new Error("Invalid server response format");
      }

      return userCredential.user;
    } catch (error) {
      console.error("Sign up error:", error);
      clearAuthTokens();
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      setIsAuthenticating(true);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const idToken = await userCredential.user.getIdToken();

      const response = await authController.login({ idToken });
      if (response.data?.accessToken && response.data?.refreshToken) {
        saveAuthTokens(response.data.accessToken, response.data.refreshToken);
      } else {
        throw new Error("Invalid server response format");
      }

      return userCredential.user;
    } catch (error) {
      console.error("Sign in error:", error);
      clearAuthTokens();
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function signInWithGoogle() {
    try {
      setIsAuthenticating(true);
      const userCredential = await signInWithPopup(auth, googleProvider);
      const idToken = await userCredential.user.getIdToken();

      const response = await authController.login({ idToken });
      if (response.data?.accessToken && response.data?.refreshToken) {
        saveAuthTokens(response.data.accessToken, response.data.refreshToken);
      } else {
        throw new Error("Invalid server response format");
      }

      return userCredential.user;
    } catch (error) {
      console.error("Google sign-in error:", error);
      clearAuthTokens();
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function sendPhoneVerificationCode(phoneNumber: string) {
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { signInStandardPrompt: false } as any,
    );
    setPhoneConfirmation(confirmationResult);
    return confirmationResult;
  }

  async function verifyPhoneCode(code: string) {
    if (!phoneConfirmation) {
      throw new Error("Chưa gửi mã xác thực");
    }

    try {
      setIsAuthenticating(true);
      const userCredential = await phoneConfirmation.confirm(code);
      const idToken = await userCredential.user.getIdToken();

      const response = await authController.login({ idToken });
      if (response.data?.accessToken && response.data?.refreshToken) {
        saveAuthTokens(response.data.accessToken, response.data.refreshToken);
      } else {
        throw new Error("Invalid server response format");
      }

      setPhoneConfirmation(null);
      return userCredential.user;
    } catch (error) {
      console.error("Phone verification error:", error);
      clearAuthTokens();
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function logout() {
    clearAuthTokens();
    await signOut(auth);
    router.push("/login");
  }

  return {
    user,
    firebaseLoading,
    phoneConfirmation,
    signUp,
    signIn,
    signInWithGoogle,
    sendPhoneVerificationCode,
    verifyPhoneCode,
    logout,
  };
}
