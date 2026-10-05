"use client";

import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, Info } from "lucide-react";
import type { SmartAlert } from "@/lib/repo";

export function SmartAlertsBanner({ alerts }: { alerts: SmartAlert[] }) {
  if (!alerts || !alerts.length) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a) => {
        const isDanger = a.type === "danger";
        const isWarning = a.type === "warning";
        const Icon = isDanger ? AlertCircle : isWarning ? AlertTriangle : Info;

        return (
          <div
            key={a.id}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition-all ${
              isDanger
                ? "border-red-200 bg-red-50 text-red-900"
                : isWarning
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-blue-200 bg-blue-50 text-blue-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-xl ${
                  isDanger ? "bg-red-100 text-red-600" : isWarning ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                }`}
              >
                <Icon size={18} />
              </span>
              <div>
                <p className="font-semibold">{a.title}</p>
                <p className="text-xs opacity-90">{a.description}</p>
              </div>
            </div>
            {a.actionUrl && (
              <Link
                href={a.actionUrl}
                prefetch={false}
                className={`btn btn-sm shrink-0 font-medium ${
                  isDanger
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : isWarning
                      ? "bg-amber-600 text-white hover:bg-amber-700"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <span>{a.actionLabel || "Verificar"}</span>
                <ArrowRight size={13} />
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
