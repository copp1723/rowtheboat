declare module '../agent/executePlan' {
  export interface ExecutionPlan {
    id: string;
    steps: unknown[];
  }
}

declare module '@eko-ai/eko' {
  interface Eko {
    complete(prompt: string, options: unknown): Promise<string>;
  }
}
