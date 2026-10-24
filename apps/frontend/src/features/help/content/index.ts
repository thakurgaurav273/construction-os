import type { HelpModule } from '../types';
import { gettingStartedHelp } from './getting-started';
import { projectsHelp } from './projects';
import { dailyReportsHelp } from './daily-reports';
import { workforceHelp } from './workforce';
import { materialsHelp } from './materials';
import { procurementHelp } from './procurement';
import { financeHelp } from './finance';
import { billingHelp } from './billing';
import { reportsHelp } from './reports';
import { aiHelp } from './ai';
import { settingsHelp } from './settings';

/** Guides ship with the features they describe; edit the module's file when its workflow changes. */
export const HELP_MODULES: HelpModule[] = [
  gettingStartedHelp,
  projectsHelp,
  dailyReportsHelp,
  workforceHelp,
  materialsHelp,
  procurementHelp,
  financeHelp,
  billingHelp,
  reportsHelp,
  aiHelp,
  settingsHelp,
];
