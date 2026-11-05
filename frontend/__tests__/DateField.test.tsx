import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DateField } from '../src/DateField';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

describe('DateField', () => {
  it('opens the calendar and returns an ISO date when choosing a leap day', async () => {
    const onChange = jest.fn();
    await render(<DateField value="2024-02-09" onChange={onChange} label="Data" />);
    expect(screen.getByText('09/02/2024')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Data: 09/02/2024. Abrir calendário'));
    await fireEvent.press(screen.getByRole('button', { name: '29/02/2024' }));
    expect(onChange).toHaveBeenCalledWith('2024-02-29');
    expect(screen.queryByText('Selecionar data')).toBeNull();
  });

  it('navigates across the year and cancels without changing the value', async () => {
    const onChange = jest.fn();
    await render(<DateField value="2025-12-31" onChange={onChange} label="Vencimento" />);
    await fireEvent.press(screen.getByLabelText('Vencimento: 31/12/2025. Abrir calendário'));
    await fireEvent.press(screen.getByLabelText('Próximo mês'));
    expect(screen.getByRole('button', { name: '01/01/2026' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('Vencimento: 31/12/2025. Abrir calendário'));
    expect(screen.getByRole('button', { name: '31/12/2025' })).toBeTruthy();
  });
});
