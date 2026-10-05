import { Loader2 } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <Loader2 size={20} className="animate-spin text-brand-600" />
        <span>Carregando...</span>
      </div>
    </div>
  );
}
