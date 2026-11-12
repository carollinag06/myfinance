// Campo de texto que aplica a máscara de moeda durante a digitação.
import React, { useRef } from 'react';
import type { TextInput, TextInputProps } from 'react-native';
import { Field } from './ui';
import { formatCurrencyInput, formatCurrencyValue, parseCurrencyInput } from './money';

type MoneyFieldProps = Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> & {
  value: string;
  onChangeText: (value: string) => void;
};

export function MoneyField({ value, onChangeText, onBlur, ...props }: MoneyFieldProps) {
  const inputRef = useRef<TextInput>(null);

  function handleChange(rawValue: string) {
    const formatted = formatCurrencyInput(rawValue);
    onChangeText(formatted);
    const moveCursorToEnd = () => inputRef.current?.setNativeProps({
      selection: { start: formatted.length, end: formatted.length },
    });
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(moveCursorToEnd);
    else setTimeout(moveCursorToEnd, 0);
  }

  function handleBlur(event: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) {
    const amount = parseCurrencyInput(value);
    if (Number.isFinite(amount)) onChangeText(formatCurrencyValue(amount));
    onBlur?.(event);
  }

  return (
    <Field
      ref={inputRef}
      {...props}
      value={value}
      onChangeText={handleChange}
      onBlur={handleBlur}
      keyboardType="decimal-pad"
    />
  );
}
