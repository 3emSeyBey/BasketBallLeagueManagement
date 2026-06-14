import Link from "next/link";
import { Volleyball } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RegisterForm } from "../login/RegisterForm";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <main className="min-h-dvh px-4 py-10">
      <div className="mx-auto w-full max-w-md space-y-6">
        <Card className="p-8 space-y-6 ring-1 ring-white/10 shadow-2xl shadow-black/30 bg-card/70 backdrop-blur-xl">
          <div className="space-y-2 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/15 ring-1 ring-primary/30 shadow-lg shadow-primary/10">
              <Volleyball className="size-6 text-primary" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">Register as a team manager</h1>
            <p className="text-sm text-muted-foreground">Create your account, then set up or claim a team</p>
          </div>
          <RegisterForm />
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">Sign in</Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
