import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { m } from '@/paraglide/messages';
import { ExternalLink, Github } from 'lucide-react';

import { SettingsSection } from './settings-section';

const GITHUB_REPO_URL = 'https://github.com/openathleteorg/openathlete';

export function ContributeTab() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title={m.contribute()}
        description={m.contribute_tab_description_ios()}
        contentClassName="pt-6"
      >
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-4 w-4" />
                {m.contribute_on_github()}
              </CardTitle>
              <CardDescription>
                {m.contribute_on_github_description()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
                  {m.open_github()} <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </SettingsSection>
    </div>
  );
}
