/** @format */

"use client";

import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

import { signOut } from "@/actions/auth/sign-out";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label="Keluar dari akun"
    >
      <LogOut aria-hidden="true" />
      {pending ? "Keluar…" : "Keluar"}
    </Button>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <SubmitButton />
    </form>
  );
}
