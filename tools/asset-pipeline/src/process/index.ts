export type ProcessResult = {
  ok: true;
  steps: string[];
};

export async function processAssets(): Promise<ProcessResult> {
  return { ok: true, steps: [] };
}
