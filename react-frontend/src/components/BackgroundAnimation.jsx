import { useEffect, useState } from "react";
import CircuitField from "./CircuitField";

export default function BackgroundAnimation() {
  const [motion, setMotion] = useState(true);

  // Check if reduced motion is preferred by the user's system
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMotion(!mq.matches);
    const onChange = () => setMotion(!mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return (
    <div className="fixed inset-0 -z-50 w-full h-full overflow-hidden pointer-events-none select-none">
      {/* 1. Ambient Blurred Floating Orbs for depth & color */}
      {motion && (
        <div className="absolute inset-0 filter blur-[100px] sm:blur-[140px] opacity-40 dark:opacity-30">
          {/* Orb 1: Seal Green / Bright Mint */}
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-[#0B5341]/30 dark:bg-[#46C79E]/15 animate-blob-1 transition-colors duration-1000" />
          
          {/* Orb 2: Brass Gold */}
          <div className="absolute bottom-[10%] right-[-10%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full bg-[#EBB542]/20 dark:bg-[#C58834]/10 animate-blob-2 transition-colors duration-1000" />
          
          {/* Orb 3: Red Tape / Coral Accent */}
          <div className="absolute top-[30%] left-[25%] w-[45vw] h-[45vw] max-w-[500px] max-h-[500px] rounded-full bg-[#B03D28]/10 dark:bg-[#B03D28]/5 animate-blob-3 transition-colors duration-1000" />
        </div>
      )}

      {/* 2. Brand Signature Circuit Board (just like the Hero section) */}
      <div className="absolute inset-0 w-full h-full">
        <CircuitField 
          className="w-full h-full text-seal dark:text-seal-bright opacity-90 dark:opacity-80" 
          animate={motion} 
        />
      </div>

      {/* 3. Radial Gradient overlay for centering focus and text readability */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(237,241,236,0.6)_80%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(7,13,11,0.7)_80%)]" />

      {/* 4. Fine Grid Overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 dark:opacity-20 grid-mask" />

      {/* 5. Bottom fade out to clean white/well background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-paper/30 dark:to-well/40" />
    </div>
  );
}
