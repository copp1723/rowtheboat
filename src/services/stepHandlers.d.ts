declare module './stepHandlers' {
  /**
   * Interface for a workflow step handler
   */
  export interface StepHandler {
    /**
     * Execute the step with the given input
     *
     * @param input - Input data for the step
     * @returns Result of the step execution
     */
    execute(input: unknown): Promise<unknown>;
  }

  /**
   * Record of step handlers by type
   */
  export const stepHandlers: Record<string, (config: Record<string, any>, context: Record<string, any>) => Promise<unknown>>;
}
