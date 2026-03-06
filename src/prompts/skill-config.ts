/**
 * NEXUS CLI - Skill Config Prompt
 *
 * Asks the user whether to enable the NEXUS Skills System and whether
 * to install the matching framework skills at init time.
 *
 * Both questions default to Yes — skills are opt-in but strongly recommended.
 */

import { confirm } from '@inquirer/prompts';

export interface SkillConfig {
  /** Whether to generate .nexus/skills/ with framework-matched core skills */
  enableSkills: boolean;
}

/**
 * Prompt the user for skill system preferences.
 *
 * @param frameworkLabel - Human-readable framework name for the prompt copy
 */
export async function promptSkillConfig(frameworkLabel: string): Promise<SkillConfig> {
  const enableSkills = await confirm({
    message: `🧠 Enable NEXUS Skills System? (Installs ${frameworkLabel} AI task skills in .nexus/skills/)`,
    default: true,
  });

  return { enableSkills };
}
