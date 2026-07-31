import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'btn-glow no-default-hover-elevate',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm rounded-xl',
        outline:
          'btn-glass no-default-hover-elevate',
        secondary:
          'bg-secondary/15 text-secondary-foreground border border-secondary/25 shadow-sm rounded-xl hover:bg-secondary/25 transition-colors',
        ghost:
          'hover:bg-primary/8 hover:text-foreground rounded-xl border border-transparent',
        link: 'text-primary underline-offset-4 hover:underline',
        gold:
          'btn-gold no-default-hover-elevate',
      },
      size: {
        default: 'min-h-9 px-5 py-2.5',
        sm: 'min-h-8 rounded-xl px-3.5 text-xs',
        lg: 'min-h-11 rounded-2xl px-8 text-[13px]',
        icon: 'h-9 w-9 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
