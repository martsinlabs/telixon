export type NgAddOptions = {
  /** The application to set up. The CLI fills in its default project. */
  project?: string;
  /** Whether `provideTelixon` starts the engine load right after the first render. */
  preloadEngine: boolean;
};
