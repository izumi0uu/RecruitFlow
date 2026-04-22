"use client";

import { useEffect, useRef, useState } from "react";

export const Terminal = () => {
  const [currentLine, setCurrentLine] = useState(0);
  const [displayedContent, setDisplayedContent] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const lines = [
    "> workspace:create --name \"Northstar Recruiting\"",
    "✓ Workspace created successfully",
    "",
    "> candidate:review --filter \"screening\"",
    "  Nina Patel",
    "  Marcus Lee",
    "  Elena Garcia",
    "",
    "> billing:status",
    "✓ Trial active · 6 days remaining",
  ];

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentLine((prev) => {
        if (prev >= lines.length) {
          setDisplayedContent([]);
          return 0;
        }

        setDisplayedContent((content) => [...content, lines[prev]]);
        return prev + 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="panel-shell bg-foreground px-5 py-5 text-sm text-background">
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <span className="size-2 rounded-full bg-white/40" />
        <span className="size-2 rounded-full bg-white/25" />
        <span className="size-2 rounded-full bg-white/15" />
      </div>

      <div className="mt-4 min-h-[18rem] space-y-2 font-mono text-[0.83rem] leading-6 text-white/82">
        {displayedContent.map((line, index) => (
          <div key={`${line}-${index}`}>{line || <br />}</div>
        ))}
        <div className="inline-block h-4 w-2 animate-pulse bg-white/80" />
      </div>
    </div>
  );
};
