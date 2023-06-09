export interface WorkflowInitiator {
  initiateWorkflow(transactionID: string, transactionRef: string): Promise<void>;
}
