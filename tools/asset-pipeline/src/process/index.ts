export type ProcessResult = {
  ok: true;
  steps: string[];
};

export function processAssets(): Promise<ProcessResult> {
  return Promise.resolve({ ok: true, steps: [] });
}
