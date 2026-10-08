import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    writeCalcPreference('last_tool', tool);
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

      {/* Mobile: sticky dropdown to pick the tool */}
      <div className="sticky top-[max(3.5rem,calc(2.25rem+var(--sat,0px)))] z-20 -mx-4 border-b bg-background/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
        <Select
          value={tool}
          onValueChange={(value) => isTool(value) && selectTool(value)}
        >
          <SelectTrigger
            aria-label={m.calculator()}
            className="h-12 w-full rounded-xl bg-background text-base font-medium shadow-sm data-[size=default]:h-12 [&_svg:not([class*='text-'])]:text-primary"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TOOLS.map(({ key, icon: Icon, label }) => (
              <SelectItem key={key} value={key} className="h-11 text-base">
                <Icon className="size-4" />
                {label()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: full-width segmented bar */}
      <nav
        aria-label={m.calculator()}
        className="hidden grid-cols-6 gap-1 rounded-2xl border bg-muted p-1 md:grid"
      >
        {TOOLS.map(({ key, icon: Icon, label }) => {
          const active = key === tool;
          return (
            <button
              key={key}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => selectTool(key)}
              className={cn(
                'inline-flex h-11 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-2 text-sm font-medium whitespace-nowrap transition-all',
                'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon
                className={cn('size-4 shrink-0', active && 'text-primary')}
              />
              <span className="truncate">{label()}</span>
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
