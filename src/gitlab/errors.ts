export class GitlabHttpError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(
    message: string,
    init: { status: number; body: string },
  ) {
    super(message);
    this.name = "GitlabHttpError";
    this.status = init.status;
    this.body = init.body;
  }
}
