"use client";

import { useCallback, useEffect, useState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/env";

type Status = "wait" | "run" | "ok" | "warn" | "fail";
type Step = { id: string; label: string; status: Status; detail: string };

const STEPS: Omit<Step, "status" | "detail">[] = [
  { id: "server", label: "타닥타닥 서버" },
  { id: "db", label: "데이터베이스 (Supabase)" },
  { id: "realtime", label: "실시간 연결 (친구 대결용 웹소켓)" },
  { id: "screen", label: "브라우저 · 화면 크기" },
];

const ICON: Record<Status, string> = { wait: "⏳", run: "🔄", ok: "✅", warn: "⚠️", fail: "❌" };

/** 실시간 채널에 나 자신에게 신호를 보내서 왕복 시간을 재요 (5번 평균) */
function realtimePing(): Promise<{ ok: boolean; ms?: number; reason?: string }> {
  return new Promise((resolve) => {
    const supabase = createClient();
    const ch = supabase.channel(`tadak-check-${Math.random().toString(36).slice(2)}`, { config: { broadcast: { self: true } } });
    const times: number[] = [];
    let sentAt = 0;
    const done = (r: { ok: boolean; ms?: number; reason?: string }) => {
      window.clearTimeout(timer);
      void supabase.removeChannel(ch);
      resolve(r);
    };
    const timer = window.setTimeout(() => done({ ok: false, reason: "10초 안에 연결되지 않았어요" }), 10000);
    const send = () => {
      sentAt = performance.now();
      void ch.send({ type: "broadcast", event: "ping", payload: {} });
    };
    ch.on("broadcast", { event: "ping" }, () => {
      times.push(performance.now() - sentAt);
      if (times.length >= 5) done({ ok: true, ms: Math.round(times.reduce((a, b) => a + b, 0) / times.length) });
      else send();
    }).subscribe((status) => {
      if (status === "SUBSCRIBED") send();
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") done({ ok: false, reason: `연결 실패 (${status})` });
    });
  });
}

async function timed<T>(fn: () => Promise<T>) {
  const t = performance.now();
  const value = await fn();
  return { value, ms: Math.round(performance.now() - t) };
}

export function CheckRunner() {
  const [steps, setSteps] = useState<Step[]>(STEPS.map((s) => ({ ...s, status: "wait", detail: "" })));
  const [running, setRunning] = useState(false);

  const set = (id: string, status: Status, detail: string) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status, detail } : s)));

  const run = useCallback(async () => {
    setRunning(true);
    setSteps(STEPS.map((s) => ({ ...s, status: "wait", detail: "" })));

    // 1. 우리 서버 (Vercel) → Supabase
    set("server", "run", "확인 중…");
    try {
      const { value: res, ms } = await timed(() => fetch("/api/health", { cache: "no-store" }));
      const body = (await res.json()) as { ok: boolean; message?: string };
      set("server", body.ok ? (ms > 1500 ? "warn" : "ok") : "fail", `${body.message ?? res.status} · ${ms}ms${ms > 1500 ? " (조금 느려요)" : ""}`);
    } catch {
      set("server", "fail", "서버에 닿지 않아요. 인터넷 연결이나 학교 방화벽을 확인해 주세요.");
    }

    // 2. 브라우저 → Supabase 직접 (학교 방화벽이 supabase.co 를 막는지)
    set("db", "run", "확인 중…");
    const env = getSupabaseEnv();
    try {
      const { value: res, ms } = await timed(() =>
        fetch(`${env?.url}/auth/v1/health`, { headers: { apikey: env?.key ?? "" }, cache: "no-store" }),
      );
      set("db", res.ok ? "ok" : "fail", res.ok ? `연결됐어요 · ${ms}ms` : `응답 ${res.status}`);
    } catch {
      set("db", "fail", "이 PC에서 supabase.co 에 닿지 않아요. 학교 방화벽 허용 목록에 *.supabase.co 를 넣어야 해요.");
    }

    // 3. 실시간 (웹소켓)
    set("realtime", "run", "웹소켓 연결 중…");
    const rt = await realtimePing();
    if (!rt.ok) {
      set("realtime", "fail", `${rt.reason}. 학교 방화벽이 웹소켓(wss://*.supabase.co)을 막고 있을 수 있어요. 친구 대결만 안 되고 나머지는 돼요.`);
    } else {
      set("realtime", rt.ms! <= 200 ? "ok" : "warn", `왕복 평균 ${rt.ms}ms${rt.ms! <= 200 ? " (좋아요!)" : " (목표 200ms보다 느려요. 대결 화면이 조금 늦게 움직일 수 있어요)"}`);
    }

    // 4. 브라우저·화면
    const chrome = /Chrome\//.test(navigator.userAgent) && !/Edg\//.test(navigator.userAgent);
    const w = window.screen.width;
    const h = window.screen.height;
    const big = w >= 1366 && h >= 768;
    set(
      "screen",
      chrome && big ? "ok" : "warn",
      `${chrome ? "크롬" : "크롬이 아니에요 (크롬을 권장해요)"} · 화면 ${w}×${h}${big ? "" : " (1366×768 이상을 권장해요)"}`,
    );

    setRunning(false);
  }, []);

  useEffect(() => {
    // 페이지를 열면 바로 한 번 점검 (외부 연결 확인이라 effect 에서 시작)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void run();
  }, [run]);

  const fails = steps.filter((s) => s.status === "fail").length;
  const finished = !running && steps.every((s) => s.status !== "wait" && s.status !== "run");

  return (
    <div className="flex flex-col gap-3 font-pixel text-body text-navy-900">
      <p>이 PC에서 타닥타닥 우리반이 잘 돌아가는지 점검해요. 로그인 없이 열려요.</p>
      <ul className="flex flex-col gap-2">
        {steps.map((s) => (
          <li key={s.id} className="win-bevel-pressed flex gap-3 bg-paper px-3 py-2">
            <span className="text-heading" aria-hidden>
              {ICON[s.status]}
            </span>
            <div>
              <p className="font-bold">{s.label}</p>
              {s.detail && <p className="text-small">{s.detail}</p>}
            </div>
          </li>
        ))}
      </ul>
      {finished && (
        <p className={`border-2 border-navy-900 px-3 py-2 font-bold ${fails ? "bg-yellow-400" : "bg-lime-400"}`}>
          {fails ? `${fails}개 항목에 문제가 있어요. 위 안내를 확인해 주세요.` : "모두 통과했다! 이 PC에서 수업할 수 있어요."}
        </p>
      )}
      <div>
        <PixelButton variant="ghost" size="sm" onClick={() => void run()} disabled={running}>
          {running ? "점검 중…" : "다시 점검"}
        </PixelButton>
      </div>
      <p className="text-small text-text-muted">
        한글 입력은 로그인 후 연습 화면에서 한/영 키를 눌러 확인해 주세요. 결과 화면을 사진으로 찍어 두면 학교 정보 담당 선생님께 보여 드리기 좋아요.
      </p>
    </div>
  );
}
