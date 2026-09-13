"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { useVisualViewport } from "@/lib/hooks/use-visual-viewport"
import { cn } from "@/lib/utils"

const TOP_INSET = 48
const MIN_SHEET_HEIGHT = 160
const MAX_HEIGHT_RATIO = 0.85
const SETTLE_DELAY = 600

function Drawer({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return (
    <DrawerPrimitive.Root
      data-slot="drawer"
      repositionInputs={false}
      {...props}
    />
  )
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  style,
  ref,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  const innerRef = React.useRef<HTMLDivElement | null>(null)
  const { height, offsetTop, innerHeight, keyboardInset, isKeyboardOpen } =
    useVisualViewport()
  const [restingHeight, setRestingHeight] = React.useState(0)

  const setRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      innerRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )

  const measurable =
    innerHeight > 0 &&
    !isKeyboardOpen &&
    offsetTop === 0 &&
    innerHeight - height < 2

  React.useLayoutEffect(() => {
    const node = innerRef.current
    if (!node || !measurable) return
    const measured = node.offsetHeight
    if (measured > 0) setRestingHeight(measured)
  }, [measurable, height])

  const viewportStyle = React.useMemo(() => {
    if (height <= 0) return undefined
    const cap = Math.max(MIN_SHEET_HEIGHT, height - TOP_INSET)
    const target =
      isKeyboardOpen && restingHeight > 0
        ? restingHeight - (keyboardInset + offsetTop)
        : Math.round(height * MAX_HEIGHT_RATIO)
    return {
      "--drawer-keyboard-inset": `${keyboardInset}px`,
      "--drawer-max-height": `${Math.min(cap, Math.max(MIN_SHEET_HEIGHT, target))}px`,
    } as React.CSSProperties
  }, [height, offsetTop, keyboardInset, isKeyboardOpen, restingHeight])

  React.useEffect(() => {
    const node = innerRef.current
    if (!node) return

    let dragging = false
    let settleTimer = 0

    const settle = () => {
      if (dragging || node.getAttribute("data-state") !== "open") return
      // WebKit #176896 paints the caret at the untransformed position, so a settled sheet is positioned and never transformed.
      node.style.transform = "none"
      node.style.willChange = "auto"
    }

    const scheduleSettle = () => {
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(settle, SETTLE_DELAY)
    }

    const onAnimationSettled = (event: Event) => {
      if (event.target === node) settle()
    }

    const onPointerDown = () => {
      dragging = true
      window.clearTimeout(settleTimer)
      node.style.transform = ""
      node.style.willChange = ""
    }

    const onPointerUp = () => {
      if (!dragging) return
      dragging = false
      scheduleSettle()
    }

    node.addEventListener("animationend", onAnimationSettled)
    node.addEventListener("transitionend", onAnimationSettled)
    node.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("pointerup", onPointerUp)
    window.addEventListener("pointercancel", onPointerUp)
    scheduleSettle()

    return () => {
      window.clearTimeout(settleTimer)
      node.removeEventListener("animationend", onAnimationSettled)
      node.removeEventListener("transitionend", onAnimationSettled)
      node.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
    }
  }, [])

  React.useEffect(() => {
    const node = innerRef.current
    if (!node) return
    let frame = 0

    const scrollActiveIntoView = () => {
      frame = 0
      const active = document.activeElement
      if (active instanceof HTMLElement && node.contains(active)) {
        active.scrollIntoView({ block: "nearest" })
      }
    }

    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(scrollActiveIntoView)
    }

    node.addEventListener("focusin", schedule)
    if (isKeyboardOpen) schedule()

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      node.removeEventListener("focusin", schedule)
    }
  }, [isKeyboardOpen])

  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={setRef}
        data-slot="drawer-content"
        style={{ ...viewportStyle, ...style }}
        className={cn(
          "group/drawer-content fixed z-50 flex h-auto flex-col bg-popover text-sm text-popover-foreground data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-[var(--drawer-keyboard-inset,0px)] data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[var(--drawer-max-height,80dvh)] data-[vaul-drawer-direction=bottom]:rounded-t-xl data-[vaul-drawer-direction=bottom]:border-t data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:rounded-r-xl data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:rounded-l-xl data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80dvh] data-[vaul-drawer-direction=top]:rounded-b-xl data-[vaul-drawer-direction=top]:border-b data-[vaul-drawer-direction=left]:sm:max-w-sm data-[vaul-drawer-direction=right]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        <div className="mx-auto mt-4 hidden h-1 w-[100px] shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "sticky top-0 z-10 flex shrink-0 flex-col gap-0.5 bg-popover p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-0.5 md:text-left",
        className
      )}
      {...props}
    />
  )
}

function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-body"
      className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", className)}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        "sticky bottom-0 z-10 mt-auto flex shrink-0 flex-col gap-2 bg-popover p-4",
        className
      )}
      {...props}
    />
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
