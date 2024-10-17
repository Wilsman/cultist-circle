"use client"

import { CookieIcon } from "lucide-react"
import { Button } from "./ui/button"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useCookieConsent } from "@/contexts/CookieConsentContext"

interface CookieConsentProps {
  variant?: "default" | "small"
}

export default function CookieConsent({
  variant = "default",
}: CookieConsentProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { cookiesAccepted, acceptCookies, declineCookies } = useCookieConsent()

  const accept = () => {
    acceptCookies()
  }

  const decline = () => {
    declineCookies()
  }

  useEffect(() => {
    setIsOpen(cookiesAccepted === null)
  }, [cookiesAccepted])

  if (!isOpen) return null

  return variant !== "small" ? (
    <div
      className={cn(
        "fixed z-[200] bottom-0 left-0 right-0 sm:left-4 sm:bottom-4 w-full sm:max-w-md duration-700",
        isOpen
          ? "transition-[opacity,transform] translate-y-0 opacity-100"
          : "transition-[opacity,transform] translate-y-8 opacity-0"
      )}
    >
      <div className="dark:bg-card bg-background rounded-md m-3 border border-border shadow-lg">
        <div className="grid gap-2">
          <div className="border-b border-border h-14 flex items-center justify-between p-4">
            <h1 className="text-lg font-medium">We use cookies</h1>
            <CookieIcon className="h-[1.2rem] w-[1.2rem]" />
          </div>
          <div className="p-4">
            <p className="text-sm font-normal text-start">
              We use cookies to ensure you get the best experience on our website. For more information on how we use cookies, please see our cookie policy.
              <br />
              <br />
              <span className="text-xs">
                By clicking &quot;<span className="font-medium opacity-80">Accept</span>&quot;, you agree to our use of cookies.
              </span>
              <br />
              <a href="#" className="text-xs underline">
                Learn more.
              </a>
            </p>
          </div>
          <div className="flex gap-2 p-4 py-5 border-t border-border dark:bg-background/20">
            <Button onClick={accept} className="w-full">
              Accept
            </Button>
            <Button onClick={decline} className="w-full" variant="secondary">
              Decline
            </Button>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div
      className={cn(
        "fixed z-[200] bottom-0 left-0 right-0 sm:left-4 sm:bottom-4 w-full sm:max-w-md duration-700",
        isOpen
          ? "transition-[opacity,transform] translate-y-0 opacity-100"
          : "transition-[opacity,transform] translate-y-8 opacity-0"
      )}
    >
      <div className="m-3 dark:bg-card bg-background border border-border rounded-lg">
        <div className="flex items-center justify-between p-3">
          <h1 className="text-lg font-medium">We use cookies</h1>
          <CookieIcon className="h-[1.2rem] w-[1.2rem]" />
        </div>
        <div className="p-3 -mt-2">
          <p className="text-sm text-left text-muted-foreground">
            We use cookies to ensure you get the best experience on our website. For more information on how we use cookies, please see our cookie policy.
          </p>
        </div>
        <div className="p-3 flex items-center gap-2 mt-2 border-t">
          <Button onClick={accept} className="w-full h-9 rounded-full">
            accept
          </Button>
          <Button onClick={decline} className="w-full h-9 rounded-full" variant="outline">
            decline
          </Button>
        </div>
      </div>
    </div>
  )
}
