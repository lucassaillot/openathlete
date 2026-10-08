import { Button } from '@/components/ui/button';
import { m } from '@/paraglide/messages';
import type { DistanceUnit } from '@/utils/running-calculator';
import { cn } from '@/utils/shadcn';
import {
  ArrowLeftRight,
  Flag,
  Gauge,
  HeartPulse,
  type LucideIcon,
  Share2,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Segmented } from './calculator-inputs';
import { ConversionsTool } from './tools/conversions-tool';
import { PaceTool } from './tools/pace-tool';
import { PredictorTool } from './tools/predictor-tool';
import { SplitsTool } from './tools/splits-tool';
import { TrainingTool } from './tools/training-tool';
import { VmaHrTool } from './tools/vma-hr-tool';
import { readCalcPreference, writeCalcPreference } from './use-tool-state';

type ToolKey = 'pace' | 'splits' | 'predictor' | 'training' | 'vma' | 'convert';

const TOOLS: { key: ToolKey; icon: LucideIcon; label: () => string }[] = [
  { key: 'pace', icon: Gauge, label: () => m.calc_tool_pace() },
  { key: 'splits', icon: Flag, label: () => m.calc_tool_splits() },
  { key: 'predictor', icon: TrendingUp, label: () => m.calc_tool_predictor() },
  { key: 'training', icon: Target, label: () => m.calc_tool_training() },
  { key: 'vma', icon: HeartPulse, label: () => m.calc_tool_vma() },
  { key: 'convert', icon: ArrowLeftRight, label: () => m.calc_tool_convert() },
];

const isTool = (value: string | null): value is ToolKey =>
  TOOLS.some((t) => t.key === value);

export function CalculatorView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTool = searchParams.get('tool');
  const tool: ToolKey = isTool(urlTool)
    ? urlTool
    : (() => {
        const stored = readCalcPreference('last_tool', 'pace');
        return isTool(stored) ? stored : 'pace';
      })();

  const [unit, setUnit] = useState<DistanceUnit>(() =>
    readCalcPreference('unit', 'km') === 'mi' ? 'mi' : 'km',
  );

  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    writeCalcPreference('last_tool', tool);
    // Keep the active chip visible in the horizontally-scrolling mobile nav
    navRef.current
      ?.querySelector<HTMLElement>(`[data-tool="${tool}"]`)
      ?.scrollIntoView({
        block: 'nearest',
        inline: 'center',
        behavior: 'smooth',
      });
  }, [tool]);

  const selectTool = (key: ToolKey) => {
    if (key === tool) return;
    setSearchParams({ tool: key }, { replace: true });
  };

  const changeUnit = (value: DistanceUnit) => {
    setUnit(value);
    writeCalcPreference('unit', value);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: m.calculator(), url });
        return;
      } catch {
        // cancelled: fall back to copying the link
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(m.calc_link_copied());
    } catch {
      toast.error(m.calc_copy_failed());
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-4 p-4 md:gap-6 md:p-8">
      <header className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="hidden min-w-0 md:block">
          <h1 className="text-2xl font-semibold">{m.calculator()}</h1>
          <p className="text-sm text-muted-foreground">
            {m.calc_page_subtitle()}
          </p>
        </div>
        <div className="flex w-full items-center gap-2 md:w-auto">
          <Segmented
            className="w-28 shrink-0 md:w-32"
            value={unit}
            onChange={changeUnit}
            options={[
              { value: 'km', label: 'km' },
              { value: 'mi', label: 'mi' },
            ]}
            aria-label={m.calc_unit()}
          />
          <Button
            type="button"
            variant="outline"
            className="ml-auto h-12 rounded-xl md:ml-0"
            onClick={handleShare}
          >
            <Share2 className="size-4" />
            {m.calc_share()}
          </Button>
        </div>
      </header>

      <nav
        ref={navRef}
        aria-label={m.calculator()}
        className={cn(
          // Mobile: sticky, horizontally scrolling chips
          'sticky top-[max(3.5rem,calc(2.25rem+var(--sat,0px)))] z-20 -mx-4 flex gap-2 overflow-x-auto border-b bg-background/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/80 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          // Desktop: full-width segmented bar
          'md:static md:mx-0 md:grid md:grid-cols-6 md:gap-1 md:overflow-visible md:rounded-2xl md:border md:bg-muted md:p-1 md:backdrop-blur-none',
        )}
      >
        {TOOLS.map(({ key, icon: Icon, label }) => {
          const active = key === tool;
          return (
            <button
              key={key}
              type="button"
              data-tool={key}
              aria-current={active ? 'page' : undefined}
              onClick={() => selectTool(key)}
              className={cn(
                'inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-all',
                'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                'md:h-11 md:min-w-0 md:rounded-xl md:border-transparent md:px-2',
                active
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm md:border-transparent md:bg-background md:text-foreground'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground md:bg-transparent',
              )}
            >
              <Icon
                className={cn('size-4 shrink-0', active && 'md:text-primary')}
              />
              <span className="md:truncate">{label()}</span>
            </button>
          );
        })}
      </nav>

      <div key={tool} className="min-w-0 animate-in fade-in-0 duration-200">
        {tool === 'pace' && <PaceTool unit={unit} />}
        {tool === 'splits' && <SplitsTool unit={unit} />}
        {tool === 'predictor' && <PredictorTool unit={unit} />}
        {tool === 'training' && <TrainingTool unit={unit} />}
        {tool === 'vma' && (
          <VmaHrTool unit={unit} onUseVma={() => selectTool('training')} />
        )}
        {tool === 'convert' && <ConversionsTool unit={unit} />}
      </div>
    </div>
  );
}
