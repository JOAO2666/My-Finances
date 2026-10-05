"use client";

import { useEffect } from "react";

export function ClickFeedback() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      // Cria uma micro-animação visual de clique em qualquer interação com elemento interativo
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest("button, a, .card, .btn, input, select, [role='button'], .tap-effect");
      if (!interactive) return;

      const x = e.clientX;
      const y = e.clientY;
      if (x === 0 && y === 0) return; // clique de teclado sem posição

      const ripple = document.createElement("span");
      ripple.className = "click-ripple-circle";
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.width = "48px";
      ripple.style.height = "48px";
      ripple.style.background = "radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, rgba(5, 150, 105, 0.15) 60%, transparent 100%)";

      document.body.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 450);
    }

    window.addEventListener("pointerdown", handleClick, { passive: true });
    return () => window.removeEventListener("pointerdown", handleClick);
  }, []);

  return null;
}
