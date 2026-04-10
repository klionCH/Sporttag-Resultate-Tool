"use client";

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import React, { useState, useRef, useEffect } from "react";
import {
  motion,
  useTransform,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "framer-motion";
import Image from "next/image";

// Tailwind-Klassen zusammenführen
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Komplementärfarbe berechnen
function getComplementaryColor([r, g, b]) {
  return `rgb(${255 - r}, ${255 - g}, ${255 - b})`;
}

// Tooltip-Liste rendern
export const AnimatedTooltip = ({ items }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const springConfig = { stiffness: 100, damping: 5 };
  const x = useMotionValue(0);
  const rotate = useSpring(useTransform(x, [-100, 100], [-45, 45]), springConfig);
  const translateX = useSpring(useTransform(x, [-100, 100], [-50, 50]), springConfig);

  // Rotation & Bewegungseffekt
  const handleMouseMove = (event) => {
    const halfWidth = event.target.offsetWidth / 2;
    x.set(event.nativeEvent.offsetX - halfWidth);
  };

  return (
      <>
        {items.map((item) => {
          return <TooltipItem key={item.id} item={item} hoveredIndex={hoveredIndex} setHoveredIndex={setHoveredIndex} handleMouseMove={handleMouseMove} rotate={rotate} translateX={translateX} />
        })}
      </>
  );
};

// Einzelnes Tooltip-Item
function TooltipItem({ item, hoveredIndex, setHoveredIndex, handleMouseMove, rotate, translateX }) {
  const [bgColor, setBgColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#000000");
  const imgRef = useRef(null);

  // Dominante Farbe aus dem Bild extrahieren
  useEffect(() => {
    const analyze = async () => {
      const img = imgRef.current;
      if (!img) return;

      if (!img.complete) {
        img.onload = () => analyze();
        return;
      }

      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        const colorCount = {};
        let maxCount = 0;
        let dominant = [0, 0, 0];

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const key = `${r},${g},${b}`;

          colorCount[key] = (colorCount[key] || 0) + 1;

          if (colorCount[key] > maxCount) {
            maxCount = colorCount[key];
            dominant = [r, g, b];
          }
        }

        setBgColor(`rgb(${dominant[0]}, ${dominant[1]}, ${dominant[2]})`);
        setTextColor(getComplementaryColor(dominant));
      } catch (err) {
        console.error("Fehler bei Farbextraktion:", err);
      }
    };

    analyze();
  }, [item.image]);

  return (
      <div
          className="group relative -mr-4"
          onMouseEnter={() => setHoveredIndex(item.id)}
          onMouseLeave={() => setHoveredIndex(null)}
      >
        {/* Unsichtbares Bild zur Farbanalyse */}
        <img
            ref={imgRef}
            src={item.image}
            alt={item.name}
            crossOrigin="anonymous"
            style={{ display: "none" }}
        />

        <AnimatePresence mode="popLayout">
          {hoveredIndex === item.id && (
              <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.6 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      type: "spring",
                      stiffness: 260,
                      damping: 10,
                    },
                  }}
                  exit={{ opacity: 0, y: 20, scale: 0.6 }}
                  style={{
                    translateX: translateX,
                    rotate: rotate,
                    whiteSpace: "nowrap",
                    backgroundColor: bgColor,
                    color: textColor,
                  }}
                  className="absolute -top-20 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center justify-center rounded-xl px-4 py-2 text-xs shadow-2xl"
              >
                <div className="relative z-30 text-base font-bold">
                  {item.name}
                </div>
                <div className="text-xs">{item.designation}</div>
              </motion.div>
          )}
        </AnimatePresence>

        {/* Bild mit Hover-Effekt */}
        <a
            href={item.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${item.name} GitHub`}
        >
          <Image
              onMouseMove={handleMouseMove}
              height={100}
              width={100}
              src={item.image}
              alt={item.name}
              style={{ backgroundColor: bgColor }}
              className="relative !m-0 h-20 w-20 rounded-full border-2 border-white object-cover object-top !p-0 transition duration-500 group-hover:z-30 group-hover:scale-105"
          />
        </a>
      </div>
  );
}
