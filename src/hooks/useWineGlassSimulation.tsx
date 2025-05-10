
import { useEffect, useRef, useState } from "react";
import { WineGlassSimulation } from "@/utils/wineGlassSimulation";
import { useIsMobile } from "@/hooks/use-mobile";

export const useWineGlassSimulation = (containerId: string) => {
  const simulationRef = useRef<WineGlassSimulation | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Skip for mobile devices
    if (isMobile) {
      return;
    }

    if (containerRef.current) {
      const container = containerRef.current;
      const { width, height } = container.getBoundingClientRect();
      
      try {
        simulationRef.current = new WineGlassSimulation({
          containerId,
          width,
          height,
          onReady: () => setIsReady(true),
        });

        // Add resize handler
        const handleResize = () => {
          if (simulationRef.current && containerRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            simulationRef.current.resize(width, height);
          }
        };

        window.addEventListener("resize", handleResize);

        return () => {
          window.removeEventListener("resize", handleResize);
          if (simulationRef.current) {
            simulationRef.current.destroy();
            simulationRef.current = null;
          }
        };
      } catch (error) {
        console.error("Error initializing wine glass simulation:", error);
        // Fall back to CSS animation
        setIsReady(false);
      }
    }
  }, [containerId, isMobile]);

  const setHovered = (isHovered: boolean) => {
    if (simulationRef.current && isReady) {
      simulationRef.current.setHovered(isHovered);
    }
  };

  return {
    containerRef,
    isReady,
    setHovered,
    isMobile,
  };
};
