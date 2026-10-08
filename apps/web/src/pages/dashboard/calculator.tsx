import { m } from '@/paraglide/messages';
import { CalculatorView } from '@/views/dashboard/calculator-view';

export function CalculatorPage() {
  return (
    <>
      <title>{m.calculator()}</title>
      <CalculatorView />
    </>
  );
}
