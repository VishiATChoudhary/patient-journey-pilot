
import { useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export const useWineGlassSimulation = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();

  return {
    containerRef,
    isMobile,
  };
};
