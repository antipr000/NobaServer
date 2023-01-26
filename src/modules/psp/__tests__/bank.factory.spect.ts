describe("getWorkflowImplementation", () => {
  it("should return WalletDepositImpl when workflowName is WALLET_DEPOSIT", () => {
    const workflow = workflowFactory.getWorkflowImplementation(WorkflowName.WALLET_DEPOSIT);
    expect(workflow).toBe(walletDepositImpl);
  });

  it("should return WalletTransferImpl when workflowName is WALLET_TRANSFER", () => {
    const workflow = workflowFactory.getWorkflowImplementation(WorkflowName.WALLET_TRANSFER);
    expect(workflow).toBe(walletTransferImpl);
  });

  it("should return WalletWithdrawalImpl when workflowName is WALLET_WITHDRAWAL", () => {
    const workflow = workflowFactory.getWorkflowImplementation(WorkflowName.WALLET_WITHDRAWAL);
    expect(workflow).toBe(walletWithdrawalImpl);
  });
});
