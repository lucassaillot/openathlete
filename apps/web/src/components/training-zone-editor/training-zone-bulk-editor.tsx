import { useReplaceTrainingZonesForType } from '@/api/training-zone';
import { ConfirmAction } from '@/components/confirm-action';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { m } from '@/paraglide/messages';
import { getErrorMessage } from '@/utils/axios';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  ReplaceTrainingZoneItemDto,
  SPORT_TYPE,
  TRAINING_ZONE_TYPE,
  TrainingZone,
  TrainingZoneValue,
} from '@openathlete/shared';

import { ColorPicker } from './color-picker';
import { MultiSportSelector } from './multi-sport-selector';
import {
  decimalMinutesToMinSec,
  minSecToDecimalMinutes,
} from './pace-format.util';

interface ZoneConfig {
  id?: number; // existing zone ID or undefined for new zones
  name: string;
  description: string;
  min: number;
  max: number;
  color: string;
  sports: SPORT_TYPE[];
}

interface TrainingZoneBulkEditorProps {
  athleteId: number;
  type: TRAINING_ZONE_TYPE;
  zones: (TrainingZone & { values: TrainingZoneValue[] })[];
  onComplete: () => void;
}

const ALL_SPORTS = Object.values(SPORT_TYPE);

const DEFAULT_COLORS = [
  '#9CA3AF', // gray-400
  '#22C55E', // green-500
  '#EAB308', // yellow-500
  '#F97316', // orange-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
];

// Helper functions for zone management
function getStepForType(type: TRAINING_ZONE_TYPE): number {
  switch (type) {
    case TRAINING_ZONE_TYPE.HEARTRATE:
      return 1; // 1 BPM
    case TRAINING_ZONE_TYPE.POWER:
      return 1; // 1 Watt
    case TRAINING_ZONE_TYPE.PACE:
      return 0.1; // 0.1 min/km
    default:
      return 1;
  }
}

function getUnitLabel(type: TRAINING_ZONE_TYPE): string {
  switch (type) {
    case TRAINING_ZONE_TYPE.HEARTRATE:
      return m.bpm();
    case TRAINING_ZONE_TYPE.POWER:
      return m.watts();
    case TRAINING_ZONE_TYPE.PACE:
      return m.per_km().replace('/', ''); // "min/km"
    default:
      return '';
  }
}

export function TrainingZoneBulkEditor({
  athleteId,
  type,
  zones: existingZones,
  onComplete,
}: TrainingZoneBulkEditorProps) {
  const [zones, setZones] = useState<ZoneConfig[]>([]);
  const [zoneIndexPendingDelete, setZoneIndexPendingDelete] = useState<
    number | null
  >(null);

  const replaceZones = useReplaceTrainingZonesForType();

  // Initialize zones from existing data or create defaults
  useEffect(() => {
    if (existingZones.length > 0) {
      setZones(
        existingZones.map((zone) => ({
          id: zone.trainingZoneId,
          name: zone.name,
          description: zone.description,
          min: zone.values[0]?.min || 0,
          max: zone.values[0]?.max || 0,
          color: zone.color,
          sports: (zone.values[0]?.sports as SPORT_TYPE[]) || ALL_SPORTS,
        })),
      );
    } else {
      // Create default zones based on type
      setZones(getDefaultZones(type));
    }
  }, [existingZones, type]);

  const handleAddZone = () => {
    const lastZone = zones[zones.length - 1];
    const newMin = lastZone ? lastZone.max + 1 : 0;
    setZones([
      ...zones,
      {
        name: `Zone ${zones.length + 1}`,
        description: '',
        min: newMin,
        max: newMin + 10,
        color: DEFAULT_COLORS[zones.length % DEFAULT_COLORS.length],
        sports: ALL_SPORTS,
      },
    ]);
  };

  const handleRemoveZone = (index: number) => {
    const newZones = zones.filter((_, i) => i !== index);
    setZones(newZones);
    setZoneIndexPendingDelete(null);
  };

  const handleMoveZone = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= zones.length) return;
    const newZones = [...zones];
    [newZones[index], newZones[targetIndex]] = [
      newZones[targetIndex],
      newZones[index],
    ];
    setZones(newZones);
  };

  const handleZoneChange = (
    index: number,
    field: keyof ZoneConfig,
    value: number | string | SPORT_TYPE[],
  ): void => {
    const newZones = [...zones];
    newZones[index] = { ...newZones[index], [field]: value };

    // Get step value for this type
    const step = getStepForType(type);

    // Smart adjustment: if max changes, adjust next zone's min
    if (field === 'max' && index < zones.length - 1) {
      const numValue =
        typeof value === 'number' ? value : parseFloat(value as string);
      if (!Number.isNaN(numValue)) {
        newZones[index + 1] = {
          ...newZones[index + 1],
          min: numValue + step,
        };
      }
    }

    // Smart adjustment: if min changes, adjust previous zone's max
    if (field === 'min' && index > 0) {
      const numValue =
        typeof value === 'number' ? value : parseFloat(value as string);
      if (!Number.isNaN(numValue)) {
        newZones[index - 1] = {
          ...newZones[index - 1],
          max: numValue - step,
        };
      }
    }

    setZones(newZones);
  };

  const handleSave = async () => {
    const payload: ReplaceTrainingZoneItemDto[] = zones.map((zone) => ({
      trainingZoneId: zone.id,
      name: zone.name,
      description: zone.description,
      color: zone.color,
      values: [{ min: zone.min, max: zone.max, sports: zone.sports }],
    }));

    try {
      await replaceZones.mutateAsync({ athleteId, type, zones: payload });
      onComplete();
    } catch (error) {
      toast.error(getErrorMessage(error, m.failed_to_save_training_zones()));
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {zones.map((zone, index) => (
          <div
            key={index}
            className="p-4 border rounded-lg space-y-4 relative group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`zone-${index}-name`}>{m.name()}</Label>
                  <Input
                    id={`zone-${index}-name`}
                    value={zone.name}
                    onChange={(e) =>
                      handleZoneChange(index, 'name', e.target.value)
                    }
                    placeholder={m.zone_name()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`zone-${index}-description`}>
                    {m.description()}
                  </Label>
                  <Input
                    id={`zone-${index}-description`}
                    value={zone.description}
                    onChange={(e) =>
                      handleZoneChange(index, 'description', e.target.value)
                    }
                    placeholder={m.optional()}
                  />
                </div>
              </div>
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  onClick={() => handleMoveZone(index, -1)}
                  type="button"
                  aria-label={m.move_up()}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={index === zones.length - 1}
                  onClick={() => handleMoveZone(index, 1)}
                  type="button"
                  aria-label={m.move_down()}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                {zones.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setZoneIndexPendingDelete(index)}
                    type="button"
                    aria-label={m.delete_zone()}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {type === TRAINING_ZONE_TYPE.PACE ? (
                <>
                  <PaceMinMaxInput
                    id={`zone-${index}-min`}
                    label={`${m.minimum()} (${m.per_km()})`}
                    value={zone.min}
                    onChange={(value) => handleZoneChange(index, 'min', value)}
                  />
                  <PaceMinMaxInput
                    id={`zone-${index}-max`}
                    label={`${m.maximum()} (${m.per_km()})`}
                    value={zone.max}
                    onChange={(value) => handleZoneChange(index, 'max', value)}
                    placeholder={
                      index === zones.length - 1
                        ? m.maximum_or_more()
                        : undefined
                    }
                  />
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor={`zone-${index}-min`}>
                      {m.minimum()} ({getUnitLabel(type)})
                    </Label>
                    <Input
                      id={`zone-${index}-min`}
                      type="number"
                      step={getStepForType(type)}
                      value={zone.min}
                      onChange={(e) =>
                        handleZoneChange(
                          index,
                          'min',
                          parseFloat(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`zone-${index}-max`}>
                      {m.maximum()} ({getUnitLabel(type)})
                    </Label>
                    <Input
                      id={`zone-${index}-max`}
                      type="number"
                      step={getStepForType(type)}
                      value={zone.max}
                      onChange={(e) =>
                        handleZoneChange(
                          index,
                          'max',
                          parseFloat(e.target.value),
                        )
                      }
                      placeholder={
                        index === zones.length - 1
                          ? m.maximum_or_more()
                          : undefined
                      }
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor={`zone-${index}-color`}>{m.color()}</Label>
                <ColorPicker
                  value={zone.color}
                  onChange={(color) => handleZoneChange(index, 'color', color)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{m.sports()}</Label>
              <MultiSportSelector
                value={zone.sports}
                onChange={(sports) => handleZoneChange(index, 'sports', sports)}
              />
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleAddZone}
        type="button"
      >
        <Plus className="h-4 w-4 mr-2" />
        {m.add_zone()}
      </Button>

      <Separator />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onComplete} type="button">
          {m.cancel()}
        </Button>
        <Button
          onClick={handleSave}
          isLoading={replaceZones.isPending}
          type="button"
        >
          {m.save()}
        </Button>
      </div>

      <ConfirmAction
        open={zoneIndexPendingDelete !== null}
        onClose={() => setZoneIndexPendingDelete(null)}
        onConfirm={() => {
          if (zoneIndexPendingDelete !== null) {
            handleRemoveZone(zoneIndexPendingDelete);
          }
        }}
        title={m.delete_zone()}
        message={m.confirm_delete_zone()}
      />
    </div>
  );
}

function PaceMinMaxInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}) {
  const { minutes, seconds } = decimalMinutesToMinSec(value);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          id={id}
          type="number"
          min={0}
          value={minutes}
          placeholder={placeholder}
          onChange={(e) =>
            onChange(
              minSecToDecimalMinutes(
                parseInt(e.target.value, 10) || 0,
                seconds,
              ),
            )
          }
          className="w-16"
        />
        <span className="text-muted-foreground">:</span>
        <Input
          type="number"
          min={0}
          max={59}
          value={seconds}
          onChange={(e) =>
            onChange(
              minSecToDecimalMinutes(
                minutes,
                parseInt(e.target.value, 10) || 0,
              ),
            )
          }
          className="w-16"
        />
      </div>
    </div>
  );
}

function getDefaultZones(type: TRAINING_ZONE_TYPE): ZoneConfig[] {
  const allSports = Object.values(SPORT_TYPE);

  switch (type) {
    case TRAINING_ZONE_TYPE.HEARTRATE:
      return [
        {
          name: 'Zone 1',
          description: 'Recovery',
          min: 0,
          max: 131,
          color: '#9CA3AF',
          sports: allSports,
        },
        {
          name: 'Zone 2',
          description: 'Endurance',
          min: 132,
          max: 142,
          color: '#22C55E',
          sports: allSports,
        },
        {
          name: 'Zone 3',
          description: 'Tempo',
          min: 143,
          max: 152,
          color: '#EAB308',
          sports: allSports,
        },
        {
          name: 'Zone 4',
          description: 'Threshold',
          min: 153,
          max: 163,
          color: '#F97316',
          sports: allSports,
        },
        {
          name: 'Zone 5',
          description: 'VO2 Max',
          min: 164,
          max: 220,
          color: '#EF4444',
          sports: allSports,
        },
      ];
    case TRAINING_ZONE_TYPE.POWER:
      return [
        {
          name: 'Zone 1',
          description: 'Active Recovery',
          min: 0,
          max: 140,
          color: '#9CA3AF',
          sports: allSports,
        },
        {
          name: 'Zone 2',
          description: 'Endurance',
          min: 141,
          max: 190,
          color: '#22C55E',
          sports: allSports,
        },
        {
          name: 'Zone 3',
          description: 'Tempo',
          min: 191,
          max: 230,
          color: '#EAB308',
          sports: allSports,
        },
        {
          name: 'Zone 4',
          description: 'Threshold',
          min: 231,
          max: 270,
          color: '#F97316',
          sports: allSports,
        },
        {
          name: 'Zone 5',
          description: 'VO2 Max',
          min: 271,
          max: 320,
          color: '#EF4444',
          sports: allSports,
        },
      ];
    case TRAINING_ZONE_TYPE.PACE:
      return [
        {
          name: 'Zone 1',
          description: 'Easy',
          min: 6.0,
          max: 7.0,
          color: '#9CA3AF',
          sports: allSports,
        },
        {
          name: 'Zone 2',
          description: 'Marathon',
          min: 5.0,
          max: 5.9,
          color: '#22C55E',
          sports: allSports,
        },
        {
          name: 'Zone 3',
          description: 'Tempo',
          min: 4.3,
          max: 4.9,
          color: '#EAB308',
          sports: allSports,
        },
        {
          name: 'Zone 4',
          description: 'Threshold',
          min: 3.8,
          max: 4.2,
          color: '#F97316',
          sports: allSports,
        },
        {
          name: 'Zone 5',
          description: 'Interval',
          min: 3.0,
          max: 3.7,
          color: '#EF4444',
          sports: allSports,
        },
      ];
    default:
      return [];
  }
}
