import { useIsMobile } from '@/hooks/use-mobile';
import { isCapacitor } from '@/utils/capacitor';
import { cn } from '@/utils/shadcn';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import * as React from 'react';

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  mobileFullscreen = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  /**
   * Whether this dialog should take over the full screen below the
   * `desktop` breakpoint (1024px). Defaults to `true` — a dialog is a
   * bottom-sheet-like full page on phones and tablets unless explicitly
   * opted out (e.g. a small yes/no confirmation, where a full-screen
   * takeover would be heavy-handed).
   */
  mobileFullscreen?: boolean;
}) {
  const isMobileViewport = useIsMobile();
  const isMobile = isCapacitor() || isMobileViewport;
  const fullscreen = mobileFullscreen && isMobile;
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // Base: flex column (not `grid`) so every child can carry
          // `min-w-0` normally, `min-w-0` on the container itself so the
          // dialog's own width can never be dictated by its widest
          // min-content child, and `overflow-x-clip` so any stray
          // overflowing descendant is clipped horizontally instead of
          // turning into a horizontal scrollbar on the whole dialog (the
          // previous `overflow-y-auto` alone forced `overflow-x: auto` by
          // CSS computation — that was the root cause of the structured
          // workout popup scrolling sideways).
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed z-50 flex w-full min-w-0 flex-col gap-4 border shadow-lg duration-200 overflow-x-clip overflow-y-auto',
          // Centered dialog (desktop, or mobile with fullscreen opted out)
          !fullscreen &&
            'top-[50%] left-[50%] max-w-[calc(100%-2rem)] max-h-[calc(100dvh-2.5rem)] translate-x-[-50%] translate-y-[-50%] rounded-lg p-6 sm:max-w-lg',
          // Full-screen sheet below the desktop breakpoint
          fullscreen &&
            'inset-0 h-[100dvh] w-full rounded-none p-4 pt-[max(1rem,var(--sat))] pb-[max(1rem,var(--sab))] lg:top-[50%] lg:left-[50%] lg:h-auto lg:max-h-[calc(100dvh-2.5rem)] lg:w-auto lg:translate-x-[-50%] lg:translate-y-[-50%] lg:rounded-lg lg:p-6 lg:pb-6 lg:pt-6',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-[max(0.75rem,var(--sat))] right-3 rounded-full p-2.5 opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 z-10">
          <XIcon />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        'flex flex-shrink-0 flex-col gap-2 pr-10 text-left pb-2 md:pb-0',
        className,
      )}
      {...props}
    />
  );
}

/**
 * The scrollable middle section of a dialog. Use this (instead of putting
 * content directly in `DialogContent`) whenever a dialog has a
 * `DialogHeader` and/or `DialogFooter` that should stay put while a long
 * body scrolls — e.g. the structured workout detail popup, whose header
 * and close button must stay reachable no matter how long the workout is.
 *
 * Purely additive: dialogs that just put their content straight inside
 * `DialogContent` keep working exactly as before (`DialogContent` itself
 * still scrolls when there's no `DialogBody` splitting things up).
 */
function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        'min-h-0 min-w-0 flex-1 overflow-x-clip overflow-y-auto overscroll-contain',
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        'text-base md:text-lg leading-none font-semibold',
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
