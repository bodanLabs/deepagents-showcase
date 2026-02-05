export async function* readSseJson(response: Response): AsyncGenerator<any> {
  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, "\n");

    let delimiterIndex = buffer.indexOf("\n\n");
    while (delimiterIndex !== -1) {
      const rawEvent = buffer.slice(0, delimiterIndex);
      buffer = buffer.slice(delimiterIndex + 2);

      const lines = rawEvent.split(/\r?\n/);
      for (const line of lines) {
        if (!line.startsWith("data:")) {
          continue;
        }
        const data = line.slice(5).trim();
        if (!data) {
          continue;
        }
        if (data === "[DONE]") {
          return;
        }
        try {
          yield JSON.parse(data);
        } catch {
          // Ignore malformed payloads.
        }
      }

      delimiterIndex = buffer.indexOf("\n\n");
    }
  }

  const trailing = buffer.trim().replace(/\r\n/g, "\n");
  if (trailing.startsWith("data:")) {
    const data = trailing.slice(5).trim();
    if (data && data !== "[DONE]") {
      try {
        yield JSON.parse(data);
      } catch {
        // Ignore malformed payloads.
      }
    }
  }
}
