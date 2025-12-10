import { useState, useEffect } from "react";

export default function useCountUp(target: number, duration: number = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) return;

    let start = count;
    let end = target;
    let startTime: number | null = null;

    function animateCounter(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const value = Math.floor(progress * (end - start) + start);
      setCount(value);

      if (progress < 1) {
        requestAnimationFrame(animateCounter);
      }
    }

    requestAnimationFrame(animateCounter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return count;
}
