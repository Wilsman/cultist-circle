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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Submit Feedback or Report Issue</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-medium">
              Type
            </label>
            <Select onValueChange={setType} required>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Issue">Issue</SelectItem>
                <SelectItem value="Feature">Feature</SelectItem>
                <SelectItem value="Suggestion">Suggestion</SelectItem>
                <SelectItem value="Recipe">Recipe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              placeholder="Please provide a detailed description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground pt-2">
              Alternatively, you can{" "}
              <a
                href="https://discord.com/users/248207695943827456"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                contact the developer directly on Discord
              </a>
              .
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            className="hover:bg-red-500/90"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            type="submit"
            className="bg-green-500 hover:bg-green-500/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
