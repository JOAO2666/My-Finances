import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Criar conta" };

export default async function RegisterPage() {
  if (await getUser()) redirect("/dashboard");
  return <AuthForm mode="register" />;
}
