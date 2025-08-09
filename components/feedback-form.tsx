"use client";

import { useState } from "react";
import { CURRENT_VERSION } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FeedbackForm({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/submit-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, description, version: CURRENT_VERSION }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      console.log("Feedback submitted successfully", result.data);
      onClose();
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-600/30 shadow-2xl">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-lg font-semibold text-slate-100">Submit Feedback or Report Issue</CardTitle>
      </CardHeader>
      <p className="px-6 text-center text-xs text-slate-400">
        If you have any issues, please try resetting the app in the settings first.
      </p>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-medium text-slate-200">
              Type
            </label>
            <Select onValueChange={setType}>
              <SelectTrigger id="type" className="h-9 rounded-full bg-slate-800/60 border-slate-600/30 text-slate-100">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-600/30 bg-slate-900/90 backdrop-blur-xl">
                <SelectItem value="Issue">Issue</SelectItem>
                <SelectItem value="Feature">Feature</SelectItem>
                <SelectItem value="Suggestion">Suggestion</SelectItem>
                <SelectItem value="Recipe">Recipe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-slate-200">
              Description
            </label>
            <Textarea
              id="description"
              placeholder="Please provide a detailed description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="min-h-[110px] rounded-2xl bg-slate-800/60 border-slate-600/30 text-slate-100 placeholder:text-slate-400"
            />
            <p className="text-xs text-slate-400">
              Alternatively, you can {" "}
              <a
                href="https://discord.gg/3dFmr5qaJK"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-slate-200"
              >
                contact us via Discord
              </a>
              .
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between pt-2">
          <Button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-full bg-slate-800/60 hover:bg-slate-800/80 text-slate-100 border border-slate-600/30 shadow-sm"
          >
            Close
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-9 px-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
