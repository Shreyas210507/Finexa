"use client";

import React, { useState, useEffect } from "react";
import { useReducedMotion } from "framer-motion";

interface CursorLightProps {
  opacity?: number;
  size?: number;
  color?: string;
  className?: string;
}

export function CursorLight({
  opacity = 0.15,
  size = 500,
  color = "139, 124, 255", // purple
  className = "",
}: CursorLightProps) {
  const [position, setPosition] = useState({ x: -1000, y: -1000 });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [shouldReduceMotion]);

  if (shouldReduceMotion) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-30 transition-opacity duration-300 ${className}`}
      style={{
        background: `radial-gradient(${size}px circle at ${position.x}px ${position.y}px, rgba(${color}, ${opacity}), transparent 70%)`,
      }}
    />
  );
}

export default CursorLight;

