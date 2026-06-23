"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type AvatarStatus = "loading" | "loaded" | "error"

const AvatarContext = React.createContext<{
  status: AvatarStatus
  setStatus: React.Dispatch<React.SetStateAction<AvatarStatus>>
} | null>(null)

export interface AvatarProps extends React.ComponentPropsWithoutRef<"div"> {
  size?: "default" | "sm" | "lg"
}

export function Avatar({
  className,
  size = "default",
  children,
  ...props
}: AvatarProps) {
  const [status, setStatus] = React.useState<AvatarStatus>("loading")

  return (
    <AvatarContext.Provider value={{ status, setStatus }}>
      <div
        data-slot="avatar"
        data-size={size}
        className={cn(
          "relative flex shrink-0 rounded-full select-none overflow-hidden items-center justify-center bg-zinc-100 dark:bg-zinc-850",
          size === "sm" && "h-6 w-6 text-[10px]",
          size === "default" && "h-8 w-8 text-xs",
          size === "lg" && "h-10 w-10 text-sm",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AvatarContext.Provider>
  )
}

export interface AvatarImageProps extends React.ComponentPropsWithoutRef<"img"> {}

export function AvatarImage({
  className,
  src,
  alt,
  ...props
}: AvatarImageProps) {
  const context = React.useContext(AvatarContext)
  const imgRef = React.useRef<HTMLImageElement>(null)

  // Use a ref to access setStatus so we don't trigger unnecessary re-renders in useEffect
  const setStatusRef = React.useRef(context?.setStatus)
  React.useEffect(() => {
    setStatusRef.current = context?.setStatus
  }, [context?.setStatus])

  React.useEffect(() => {
    const setStatus = setStatusRef.current
    if (!src) {
      setStatus?.("error")
      return
    }
    
    setStatus?.("loading")

    if (imgRef.current?.complete) {
      setStatus?.("loaded")
    }
  }, [src])

  if (!src || context?.status === "error") return null

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onLoad={() => context?.setStatus("loaded")}
      onError={() => context?.setStatus("error")}
      className={cn(
        "aspect-square h-full w-full object-cover rounded-full transition-opacity duration-200 absolute inset-0 z-10",
        context?.status === "loaded" ? "opacity-100" : "opacity-0",
        className
      )}
      {...props}
    />
  )
}

export interface AvatarFallbackProps extends React.ComponentPropsWithoutRef<"div"> {}

export function AvatarFallback({
  className,
  children,
  ...props
}: AvatarFallbackProps) {
  const context = React.useContext(AvatarContext)

  // Only render the fallback if status is NOT loaded
  if (context?.status === "loaded") return null

  return (
    <div
      data-slot="avatar-fallback"
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-350 font-semibold",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
