"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    target: "#pvp-toggle",
    title: "PVP Toggle",
    content: "Toggle between PVP and PVE modes to adjust calculations.",
  },
  {
    target: "#threshold",
    title: "Threshold Setting",
    content: "Set your desired threshold value for item selection.",
  },
  {
    target: "#auto-select",
    title: "Auto Select",
    content:
      "Automatically select the best value-to-priced items based on your threshold.",
  },
  {
    target: "#search-items",
    title: "Search Items",
    content:
      "Use the Item Selector to search and choose items based on their Base Value, pin to lock-in, override flea prices if needed and exclude items from Autopick calculations.",
  },
  {
    target: "#sacrifice-value",
    title: "Sacrifice Value",
    content: "This is the TOTAL base value of the selected items. The base price of any item can be calculated by dividing the trader buyback price with the multiplier of that trader. Traders have a different multiplier.",
  },
];

export default function TourOverlay() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const handleLoad = () => {
      const isDevelopment =
        process.env.NODE_ENV === "development" ||
        ["localhost", "127.0.0.1"].includes(window.location.hostname);

      if (isDevelopment) {
        localStorage.setItem("tourCompleted", "false");
      }

      if (localStorage.getItem("tourCompleted") !== "true") {
        setIsVisible(true);
      }
    };

    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
      return () => window.removeEventListener("load", handleLoad);
    }
  }, []);

  useLayoutEffect(() => {
    if (isVisible && currentStep < steps.length) {
      const targetElement = document.querySelector(steps[currentStep].target);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setTargetRect(rect);
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        console.warn(
          `Element not found for selector: ${steps[currentStep].target}`
        );
        setTargetRect(null);
      }
    }
  }, [currentStep, isVisible]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsVisible(false);
      localStorage.setItem("tourCompleted", "true");
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    localStorage.setItem("tourCompleted", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="fixed inset-0 bg-black bg-opacity-50"></div>
      {targetRect && (
        <div
          className="absolute border-2 border-primary pointer-events-none"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: "4px",
            boxSizing: "border-box",
          }}
        ></div>
      )}
      <AnimatePresence>
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
          className="fixed z-50 bg-primary rounded-lg shadow-lg p-6 max-w-md w-full mx-4 top-20 left-1/2 transform -translate-x-1/2 pointer-events-auto"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-secondary">
              {steps[currentStep].title}
            </h2>
            <Button variant="ghost" size="icon" onClick={handleSkip}>
              <X className="h-6 w-6" />
            </Button>
          </div>
          <p className="text-muted-foreground mb-6">
            {steps[currentStep].content}
          </p>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <div className="space-x-2">
              <Button variant="outline" onClick={handleSkip}>
                Skip
              </Button>
              <Button onClick={handleNext}>
                {currentStep === steps.length - 1 ? "Finish" : "Next"}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
