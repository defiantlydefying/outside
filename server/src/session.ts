import { z } from 'zod';

export const checkInSchema = z.object({
  minutes: z.union([z.literal(3), z.literal(5), z.literal(10)]),
  feeling: z.enum(['Overwhelmed', 'Restless', 'Tired', 'Just pausing']),
  surroundings: z.string().trim().max(500),
  position: z.enum(['Sitting', 'Walking']),
  guidance: z.enum(['Less', 'More']),
});
export type CheckIn = z.infer<typeof checkInSchema>;
export const scriptSchema = z.object({
  title: z.string().min(1).max(60),
  prompts: z.array(z.string().min(10).max(350)).length(5),
});
export type Script = z.infer<typeof scriptSchema>;

// Small prototype tripwires, not a clinical risk assessment.
const unsafeInstructions = /hold (your |the )?breath|hyperventilat|close your eyes|cure|diagnos|guaranteed|you are safe|stop (taking|your) medication/i;
export function validateScript(script: Script, checkIn: CheckIn): Script {
  const parsed = scriptSchema.parse(script);
  const wordLimit = checkIn.guidance === 'Less' ? 35 : 50;
  for (const prompt of parsed.prompts) {
    if (prompt.split(/\s+/).length > wordLimit || unsafeInstructions.test(prompt)) {
      throw new Error('The guidance did not pass the session checks. Please try again.');
    }
  }
  return parsed;
}

export function pauseSchedule(totalSeconds: number, spokenSeconds: number[]): number[] {
  if (spokenSeconds.length !== 5 || spokenSeconds.some(n => !Number.isFinite(n) || n <= 0)) {
    throw new Error('Invalid narration durations.');
  }
  const quietSeconds = totalSeconds - spokenSeconds.reduce((sum, n) => sum + n, 0);
  if (quietSeconds < 40) throw new Error('Narration is too long for this break.');
  // Four quiet spaces between five prompts; no JS timers are needed on the phone.
  return [0.15, 0.30, 0.35, 0.20].map(weight => quietSeconds * weight);
}
