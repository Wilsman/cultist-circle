"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    target: "#help",
    title: "Help",
    content: "Click here to open the help pane.",
  },
  {
    target: "#settings",
    title: "Settings",
    content:
      "Click here to open the settings pane. ⚠️ If you are having problems with the app, try resetting from within the settings.",
  },
  {
    target: "#pvp-toggle",
    title: "PVP Toggle",
    content: "Toggle between PVP and PVE item lists and flea market prices.",
  },
  {
    target: "#threshold",
    title: "Threshold Setter",
    content: "Set your threshold. See threshold helper for more info.",
  },
  {
    target: "#threshold-helper",
    title: "Threshold Helper",
    content:
      "The threshold helper will explain current known thresholds and what they will result in.",
  },
  {
    target: "#auto-select",
    title: "Auto Select",
    content:
      "Automatically select the best value-to-price items based on your threshold.",
  },
  {
    target: "#search-items",
    title: "Search Items",
    content:
      "Use the Item Selector to search and choose items based on their Base Value. Pin to lock-in, override flea prices if needed, and exclude items from Autopick calculations.",
  },
  {
    target: "#clear-item-fields",
    title: "Clear Selected Items",
    content: "Clears all selected items.",
  },
  {
    target: "#reset-overrides",
    title: "Reset overrides",
    content: "Resets all flea price overrides and excluded items.",
  },
  {
    target: "#sacrifice-value",
    title: "Sacrifice Value",
    content:
      "This is the TOTAL base value of the selected items. (You can find more info about base values via tarkov wiki).",
  },
];

export default function TourOverlay() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const handleLoad = () => {
      if (!localStorage.getItem("tourCompleted") || localStorage.getItem("tourCompleted") === "false") {
        setIsVisible(true);
      }
    };

    window.addEventListener("load", handleLoad);
    if (document.readyState === "complete") {
      handleLoad();
    }

    return () => window.removeEventListener("load", handleLoad);
  }, []);

  useLayoutEffect(() => {
    const updateTargetRect = () => {
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
    };

    updateTargetRect();

    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect);

    return () => {
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect);
    };
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

  const overlayStyle = targetRect
    ? {
        top:
          targetRect.bottom + 10 > window.innerHeight / 2
            ? targetRect.top - 10 - 250 // Adjust 250 to the height of your overlay
            : targetRect.bottom + 10, // Position below the target element
        left: window.innerWidth <= 768 ? "0%" : "25%",
        transform: "translateX(-50%)",
      }
    : {};

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="fixed inset-0 bg-black bg-opacity-50"></div>
      {targetRect && (
        <div
          className="absolute border-4 pointer-events-none border-yellow-300 border-dashed animate-pulse"
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
          className="fixed z-50 w-full max-w-lg p-6 mx-auto rounded-lg shadow-lg pointer-events-auto bg-primary"
          style={overlayStyle}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-secondary">
              {steps[currentStep].title}
            </h2>
            <Button variant="ghost" size="icon" onClick={handleSkip}>
              <X className="w-6 h-6 text-secondary hover:text-primary" />
            </Button>
          </div>
          <p className="mb-6 text-muted-foreground">
            {steps[currentStep].content}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={handleSkip}
                className="w-20 bg-gray-800 text-gray-200 hover:bg-gray-600 hover:text-gray-400"
              >
                Skip
              </Button>
              <Button
                onClick={handleNext}
                className="w-20 bg-secondary text-secondary-foreground hover:bg-gray-200 hover:text-secondary-foreground"
              >
                {currentStep === steps.length - 1 ? "Finish" : "Next"}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
