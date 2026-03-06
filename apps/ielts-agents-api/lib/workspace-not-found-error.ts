export class WorkspaceNotFoundError extends Error {
  constructor() {
    super("Failed to find workspace");
  }
}
