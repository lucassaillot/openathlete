import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserRoles } from '@/contexts/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { m } from '@/paraglide/messages';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AthletesTab } from './athletes-tab';
import { CoachesTab } from './coaches-tab';
import { ConnectorsTab } from './connectors-tab';
import { ContributeTab } from './contribute-tab';
import { EquipmentTab } from './equipment-tab';
import { InvitationsTab } from './invitations-tab';
import { ProfileTab } from './profile-tab';
import { TrainingZonesTab } from './training-zones-tab';

export function SettingsView() {
  const roles = useUserRoles();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'connectors');

  const sections = useMemo(
    () => [
      { value: 'connectors', label: m.connectors() },
      { value: 'profile', label: m.profile() },
      { value: 'equipment', label: m.equipment() },
      { value: 'training_zones', label: m.training_zones() },
      ...(roles?.includes('COACH')
        ? [{ value: 'athletes', label: m.athletes() }]
        : []),
      ...(roles?.includes('ATHLETE')
        ? [{ value: 'coaches', label: m.coaches() }]
        : []),
      { value: 'invitations', label: m.invitations() },
      { value: 'contribute', label: m.contribute() },
    ],
    [roles],
  );

  // Update active tab when URL param changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <div className="w-full p-4 md:p-8">
      <h1 className="text-2xl font-semibold hidden md:block">{m.settings()}</h1>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-4">
        {isMobile ? (
          <Select value={activeTab} onValueChange={handleTabChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sections.map((section) => (
                <SelectItem key={section.value} value={section.value}>
                  {section.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
            <TabsList className="w-max md:w-auto flex-nowrap md:flex-wrap min-w-full md:min-w-0">
              {sections.map((section) => (
                <TabsTrigger key={section.value} value={section.value}>
                  {section.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        )}
        <TabsContent value="connectors" className="mt-6">
          <ConnectorsTab />
        </TabsContent>
        <TabsContent value="profile" className="mt-6">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="equipment" className="mt-6">
          <EquipmentTab />
        </TabsContent>
        <TabsContent value="training_zones" className="mt-6">
          <TrainingZonesTab />
        </TabsContent>
        <TabsContent value="athletes" className="mt-6">
          <AthletesTab />
        </TabsContent>
        <TabsContent value="coaches" className="mt-6">
          <CoachesTab />
        </TabsContent>
        <TabsContent value="invitations" className="mt-6">
          <InvitationsTab />
        </TabsContent>
        <TabsContent value="contribute" className="mt-6">
          <ContributeTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
