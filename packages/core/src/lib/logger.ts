import { createLogger, format, transports } from 'winston';

type LogEntry = {
  requestId?: string;
  message: string;
  data?: unknown;
  error?: unknown;
  resourceId?: string;
};
class Logger {
  // eslint-disable-next-line no-use-before-define
  private static instance: Logger;
  private logger;

  constructor() {
    const logFormat = format.combine(format.timestamp(), format.json());

    this.logger = createLogger({
      format: logFormat,
      transports: [new transports.Console()],
    });
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  public info(logEntry: LogEntry): void {
    this.log('info', logEntry);
  }
  public warn(logEntry: LogEntry): void {
    this.log('warn', logEntry);
  }
  public error(logEntry: LogEntry): void {
    this.log('error', logEntry);
  }
  public debug(logEntry: LogEntry): void {
    this.log('debug', logEntry);
  }

  private log(level: string, logEntry: LogEntry): void {
    this.logger.log({
      level,
      ...logEntry,
    });
  }
}
export const logger = Logger.getInstance();
