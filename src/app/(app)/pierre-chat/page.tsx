import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { PierreChatInterface } from "@/components/pierre-chat";

export const metadata = {
  title: "Pierre Chat · Interface Oficial (pierre.finance/chat)",
  description: "Clone fiel da interface pierre.finance/chat com os agentes Albert, Marie, Galileu e Pierre Computer integrados às suas finanças.",
};

export default async function PierreChatPage() {
  const user = await requireUser();

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8">
      <Suspense fallback={<div className="h-screen w-full animate-pulse bg-[#070b12]" />}>
        <PierreChatInterface hasKey={user.hasGeminiKey} />
      </Suspense>
    </div>
  );
}
