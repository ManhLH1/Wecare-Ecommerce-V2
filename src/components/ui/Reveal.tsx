import React, { useState, useEffect } from 'react';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "scale";
  delay?: number;
  as?: keyof JSX.IntrinsicElements;
}

const Reveal: React.FC<RevealProps> = ({
  children,
  className = "",
  direction = "up",
  delay = 0,
  as = "div",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = elementRef.current as Element | null;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px", threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const hiddenTransform =
    direction === "up"
      ? "translate-y-4"
      : direction === "down"
      ? "-translate-y-4"
      : direction === "left"
      ? "-translate-x-4"
      : direction === "right"
      ? "translate-x-4"
      : direction === "scale"
      ? "scale-95"
      : "translate-y-4";

  const Tag: any = as;

  return (
    <Tag
      ref={elementRef as any}
      className={`${className} transition-all duration-700 will-change-transform ${
        isVisible
          ? "opacity-100 translate-x-0 translate-y-0 scale-100"
          : `opacity-0 ${hiddenTransform}`
      }`}
      style={{
        transitionDelay: `${delay}ms`,
        transitionProperty: "opacity, transform",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
