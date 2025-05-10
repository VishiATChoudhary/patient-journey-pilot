
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export const useWineGlassSimulation = () => {
  const [isHovering, setIsHovering] = useState(false);
  const isMobile = useIsMobile();

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  return {
    isHovering,
    handleMouseEnter,
    handleMouseLeave,
    isMobile,
  };
};
