declare module './workflowEmailServiceFixed' {
  export function sendWorkflowCompletionEmail(
    workflowId: string,
    recipient: string,
    variables: Record<string, unknown>
  ): Promise<void>;
}
