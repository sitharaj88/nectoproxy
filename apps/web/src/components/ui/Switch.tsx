import * as RSwitch from '@radix-ui/react-switch';
import { cn } from './cn';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
}

export function Switch({ checked, onCheckedChange, disabled, id, ...aria }: SwitchProps) {
  return (
    <RSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full border transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
        'disabled:opacity-50 disabled:pointer-events-none',
        'data-[state=unchecked]:bg-surface-raised data-[state=unchecked]:border-edge-strong',
        'data-[state=checked]:bg-accent data-[state=checked]:border-accent'
      )}
      {...aria}
    >
      <RSwitch.Thumb
        className={cn(
          'block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
          'data-[state=unchecked]:translate-x-0.5 data-[state=checked]:translate-x-[15px]'
        )}
      />
    </RSwitch.Root>
  );
}
