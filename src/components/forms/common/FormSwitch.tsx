import React, { forwardRef } from 'react';
import { Switch } from '@/components/ui/switch';

export type FormSwitchProps = React.ComponentProps<typeof Switch>;

export const FormSwitch = forwardRef<
  React.ElementRef<typeof Switch>,
  FormSwitchProps
>((props, ref) => {
  return <Switch ref={ref} {...props} />;
});

FormSwitch.displayName = 'FormSwitch';
