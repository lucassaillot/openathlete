import { cn } from '@/utils/shadcn';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

const badgeVariants = cva(
  'inline-flex w-fit min-w-0 max-w-full items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium gap-1 [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow]',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
      },
      // Most badges hold a short, static label and should ellipsize rather
      // than push their siblings around or overflow when space is tight
      // (`truncate` also gives us `min-width` awareness via the `min-w-0`
      // above). Set `wrap` when the label is long, free-form, dynamic
      // text (e.g. a target zone description) that reads better wrapped
      // onto 2 lines than cut off.
      wrap: {
        false: 'truncate',
        true: 'whitespace-normal break-words text-left',
      },
    },
    defaultVariants: {
      variant: 'default',
      wrap: false,
    },
  },
);

function Badge({
  className,
  variant,
  wrap,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, wrap }), className)}
      {...props}
    />
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants };
