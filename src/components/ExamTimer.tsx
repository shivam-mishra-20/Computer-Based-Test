"use client";
import React, { useEffect, useState } from "react";

export default function ExamTimer({
  seconds = 0,
  onExpire,
}: {
  seconds?: number;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    const t = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(t);
  }, [remaining, onExpire]);

  return <div>Time left: {remaining}s</div>;
}
