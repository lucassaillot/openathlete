import { m } from '@/paraglide/messages';
import {
  StrengthProgramView,
  StrengthView,
} from '@/views/dashboard/strength-view';
import { useParams } from 'react-router-dom';

export function StrengthPage() {
  return (
    <>
      <title>{m.strength_title()}</title>
      <StrengthView />
    </>
  );
}

export function StrengthProgramPage() {
  const { programId } = useParams<{ programId: string }>();
  return (
    <>
      <title>{m.strength_title()}</title>
      <StrengthProgramView programId={Number(programId)} />
    </>
  );
}
