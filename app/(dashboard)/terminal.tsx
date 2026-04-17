"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

export const Terminal = () => {
  const [terminalStep, setTerminalStep] = useState(0);
  const [copied, setCopied] = useState(false);

  const terminalSteps = [
    "workspace:create recruitflow",
    "jobs:publish senior-product-designer",
    "candidates:import --source greenhouse.csv",
    "notes:index --workspace midnight",
    "pipeline:sync --theme graphite",
    "dashboard:ready",
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setTerminalStep((prev) =>
        prev < terminalSteps.length - 1 ? prev + 1 : prev
      );
    }, 520);

    return () => clearTimeout(timer);
  }, [terminalStep, terminalSteps.length]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(terminalSteps.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,#111214,#060607_70%)] text-white shadow-[0_40px_120px_-60px_rgba(0,0,0,0.9)]">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <span className="size-2.5 rounded-full bg-red-400/80" />
              <span className="size-2.5 rounded-full bg-amber-300/80" />
              <span className="size-2.5 rounded-full bg-emerald-400/80" />
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                RecruitFlow
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Workspace boot sequence
              </p>
            </div>
          </div>
          <button
            onClick={copyToClipboard}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-400 transition-colors hover:text-white"
            aria-label="Copy demo commands"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-3 px-5 py-6 font-mono text-sm">
        {terminalSteps.map((step, index) => (
          <div
            key={step}
            className={`transition-opacity duration-300 ${
              index > terminalStep ? "opacity-0" : "opacity-100"
            }`}
          >
            <span className="mr-3 text-zinc-500">$</span>
            <span className="text-zinc-100">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
