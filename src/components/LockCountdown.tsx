"use client";

import { useEffect, useState } from "react";

interface LockCountdownProps {
  lockTime: string; // ISO string
}

export default function LockCountdown({ lockTime }: LockCountdownProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    function update() {
      const now = new Date();
      const lock = new Date(lockTime);
      const diff = lock.getTime() - now.getTime();

      if (diff <= 0) {
        setIsLocked(true);
        setTimeLeft("LOCKED");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);
      setTimeLeft(parts.join(" "));
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lockTime]);

  if (isLocked) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        LOCKED
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      Locks in {timeLeft}
    </span>
  );
}
