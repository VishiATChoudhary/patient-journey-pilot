
import { useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export const useWineGlassSimulation = (containerId: string) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(true); // Always ready with CSS
  const isMobile = useIsMobile();

  // Simplified hover handler (no Three.js)
  const setHovered = (isHovered: boolean) => {
    // No-op - CSS will handle hover effects
  };

  return {
    containerRef,
    isReady,
    setHovered,
    isMobile,
  };
};
