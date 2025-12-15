"use client";

import React, { useEffect, useState } from "react";

interface Snowflake {
  id: number;
  size: number;
  left: number;
  duration: number;
  sway: number;
  delay: number;
}

export function ChristmasSnow() {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);

  // Check localStorage and set up listener
  useEffect(() => {
    const checkSnowSetting = () => {
      const saved = localStorage.getItem("christmasSnow");
      const enabled = saved !== "false"; // Default to true
      setIsEnabled(enabled);
    };

    // Initial check
    checkSnowSetting();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "christmasSnow") {
        checkSnowSetting();
      }
    };

    // Also listen for custom events for same-tab updates
    const handleCustomEvent = () => {
      checkSnowSetting();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("christmasSnowChange", handleCustomEvent);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("christmasSnowChange", handleCustomEvent);
    };
  }, []);

  useEffect(() => {
    if (!isEnabled) {
      setSnowflakes([]);
      return;
    }

    // Generate snowflakes with varied properties
    const flakes = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      size: Math.random() * 10 + 8, // 8-18px
      left: Math.random() * 100,
      duration: Math.random() * 35 + 8, // 8-43s fall time (more varied)
      sway: Math.random() * 60 + 15, // 15-75px sway (more varied)
      delay: Math.random() * 10, // Staggered start 0-10s
    }));
    setSnowflakes(flakes);
  }, [isEnabled]);

  if (!isEnabled || snowflakes.length === 0) {
    return null;
  }

  return (
    <>
      <style jsx>{`
        /* Snow container */
        .christmas-snow {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
          z-index: 0;
        }

        /* Individual snowflakes */
        .christmas-snowflake {
          position: absolute;
          top: -20px;
          color: rgba(255, 255, 255, 0.9);
          user-select: none;
          pointer-events: none;
          animation: snowfall var(--fall-duration, 15s) linear infinite;
          font-size: var(--size, 12px);
          left: var(--left-position, 50%);
          text-shadow: 0 0 3px rgba(255, 255, 255, 0.5);
          opacity: 0;
          will-change: transform, opacity;
        }

        @keyframes snowfall {
          0% {
            transform: translateY(-20px) translateX(0);
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          25% {
            transform: translateY(calc(25vh)) translateX(var(--sway-amount, 30px));
          }
          50% {
            transform: translateY(calc(50vh)) translateX(0);
          }
          75% {
            transform: translateY(calc(75vh))
              translateX(calc(var(--sway-amount, 30px) * -1));
          }
          95% {
            opacity: 1;
          }
          100% {
            transform: translateY(calc(100vh + 20px)) translateX(0);
            opacity: 0;
          }
        }
      `}</style>
      
      <div className="christmas-snow">
        {snowflakes.map((flake) => (
          <div
            key={flake.id}
            className="christmas-snowflake"
            style={
              {
                "--size": `${flake.size}px`,
                "--left-position": `${flake.left}%`,
                "--fall-duration": `${flake.duration}s`,
                "--sway-amount": `${flake.sway}px`,
                animationDelay: `${flake.delay}s`,
              } as React.CSSProperties
            }
          >
            ❄
          </div>
        ))}
      </div>
      

    </>
  );
}