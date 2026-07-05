import { Message } from "@/types/message.type";

export function createMessage(
  role: Message["role"],
  text: string,
  kind?: Message["kind"],
): Message {
  return {
    role,
    text,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    kind,
  };
}
