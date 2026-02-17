import { JsonHubProtocol } from "@microsoft/signalr";

const RECORD_SEPARATOR = String.fromCharCode(0x1e);

export class SafeJsonHubProtocol extends JsonHubProtocol {
  constructor(connectionName) {
    super();
    this.connectionName = connectionName ?? "hub";
  }

  parseMessages(input, logger) {
    try {
      return super.parseMessages(input, logger);
    } catch (error) {
      // Fallback parser: keep valid frames and skip malformed ones.
      if (typeof input !== "string" || input.length === 0) {
        return [];
      }

      const parsedMessages = [];
      const frames = input.split(RECORD_SEPARATOR).filter(Boolean);

      for (const frame of frames) {
        try {
          const parsed = JSON.parse(frame);
          if (parsed && typeof parsed.type === "number") {
            parsedMessages.push(parsed);
            continue;
          }
          console.error(`[SignalR:${this.connectionName}] Ignored frame with invalid 'type'.`, {
            frameLength: frame.length,
            preview: frame.slice(0, 300),
          });
        } catch (frameError) {
          console.error(`[SignalR:${this.connectionName}] Ignored malformed JSON frame.`, {
            error: frameError?.message ?? String(frameError),
            frameLength: frame.length,
            preview: frame.slice(0, 300),
          });
        }
      }

      return parsedMessages;
    }
  }
}

