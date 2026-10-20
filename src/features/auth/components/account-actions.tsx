/** @format */

import { KeyRound } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "@/features/auth/components/sign-out-button";

export function AccountActions() {
  return (
    <div className="flex items-center gap-1">
      <Link
        href="/app/account/password"
        aria-label="Ganti kata sandi"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <KeyRound aria-hidden="true" />
        <span className="hidden sm:inline">Kata sandi</span>
      </Link>
      <SignOutButton />
    </div>
  );
}
