import { motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

interface GlassSphereProps {
  size: number;
  color: string;
  initialX: number;
  initialY: number;
  delay?: number;
}

const GlassSphere = ({ size, color, initialX, initialY, delay = 0 }: GlassSphereProps) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  useEffect(() => {
    mouseX.set(mousePos.x);
    mouseY.set(mousePos.y);
  }, [mousePos, mouseX, mouseY]);

  const offsetX = useTransform(mouseX, [0, window.innerWidth], [-15, 15]);
  const offsetY = useTransform(mouseY, [0, window.innerHeight], [-15, 15]);

  return (
    <motion.div
      className="absolute animate-liquid-morph"
      style={{
        width: size,
        height: size,
        left: `${initialX}%`,
        top: `${initialY}%`,
        background: `radial-gradient(circle at 30% 30%, ${color}40, ${color}15, transparent 70%)`,
        border: `1px solid ${color}20`,
        backdropFilter: "blur(8px)",
        x: offsetX,
        y: offsetY,
      }}
      animate={{ y: [0, -20, 0] }}
      transition={{
        duration: 6 + delay,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
};

export default GlassSphere;
