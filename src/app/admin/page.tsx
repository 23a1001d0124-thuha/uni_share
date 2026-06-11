"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Shield, Trash2 } from "lucide-react";

type ListingReport = {
  id: string;
  product_id: string;
  product_name?: string;
  reporter_name?: string;
  seller_name?: string;
  reason: string;
  status: string;
  created_at: string;
};

export default function AdminPage() {
  const [reports, setReports] = useState<ListingReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "removed">("pending");

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/reports");
      const data = await response.json();
      setReports(data.reports || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const updateReport = async (id: string, status: "reviewed" | "removed") => {
    await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    await loadReports();
  };

  const visibleReports = reports.filter((report) => filter === "all" || report.status === filter);
  const pendingCount = reports.filter((report) => report.status === "pending").length;

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-rose-600">
              <Shield className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-wide">UNI-SHARE Admin</span>
            </div>
            <h1 className="mt-2 text-2xl font-black">Kiem duyet bao cao vi pham</h1>
            <p className="mt-1 text-sm text-stone-500">Xu ly report, theo doi tin dang co rui ro va giu cho cho sinh vien an toan.</p>
          </div>
          <button
            onClick={loadReports}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Tai lai
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-6">
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-xs font-bold text-stone-500">Dang cho xu ly</p>
            <p className="mt-2 text-3xl font-black text-rose-600">{pendingCount}</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-xs font-bold text-stone-500">Tong bao cao</p>
            <p className="mt-2 text-3xl font-black">{reports.length}</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-xs font-bold text-stone-500">Canh bao</p>
            <p className="mt-2 text-sm font-bold text-stone-700">Report moi duoc luu DB va co fallback khi chua cau hinh Supabase.</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(["pending", "all", "reviewed", "removed"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-lg px-3 py-2 text-xs font-black uppercase ${filter === item ? "bg-rose-600 text-white" : "bg-white text-stone-600 border border-stone-200"}`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          {isLoading ? (
            <div className="p-8 text-center text-sm font-bold text-stone-500">Dang tai bao cao...</div>
          ) : visibleReports.length === 0 ? (
            <div className="p-8 text-center text-sm font-bold text-stone-500">Khong co bao cao nao trong bo loc nay.</div>
          ) : (
            visibleReports.map((report) => (
              <div key={report.id} className="border-b border-stone-100 p-4 last:border-b-0">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      <h2 className="font-black">{report.product_name || report.product_id}</h2>
                      <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-black uppercase text-stone-600">{report.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-stone-700">{report.reason}</p>
                    <p className="mt-2 text-xs text-stone-500">Nguoi bao cao: {report.reporter_name || "guest"} | Nguoi ban: {report.seller_name || "unknown"}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => updateReport(report.id, "reviewed")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Duyet
                    </button>
                    <button onClick={() => updateReport(report.id, "removed")} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">
                      <Trash2 className="h-4 w-4" />
                      Go tin
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
