import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

interface ThresholdHelperPopupProps {
  isOpen: boolean
  onClose: () => void
  onSetThreshold: (threshold: number) => void
}

export function ThresholdHelperPopup({
  isOpen,
  onClose,
  onSetThreshold,
}: ThresholdHelperPopupProps) {
  const [objective, setObjective] = useState<string | null>(null)

  const handleSetThreshold = () => {
    if (objective === 'quest') {
      onSetThreshold(400000)
    } else if (objective === 'highValue') {
      onSetThreshold(350001)
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Threshold Helper</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Choose your objective to determine the optimal threshold.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup value={objective || ''} onValueChange={setObjective}>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="quest" id="quest" className="text-primary bg-background" />
              <Label htmlFor="quest">Quest/Hideout Items (6h sacrifice timer)</Label>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              Sets threshold to 400,000. This optimizes for a 25% chance of triggering the 6h sacrifice timer. If the 6h timer is not activated, it defaults to the 14h timer, yielding a high-value item instead.
            </p>
          </div>
          <div className="flex flex-col space-y-2 mt-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="highValue" id="highValue" className="text-primary bg-background" />
              <Label htmlFor="highValue">High-Value Items (14h sacrifice timer)</Label>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              Sets threshold to 350,001. This gives a higher chance of triggering the 14h sacrifice timer for high-value items.
            </p>
          </div>
        </RadioGroup>
        <DialogFooter>
          <Button className="bg-secondary text-primary hover:bg-secondary/80" onClick={handleSetThreshold} disabled={!objective}>
            Set Threshold
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
