import { Message } from "@/types/message.type";

export function createMessage(role: Message["role"], text: string): Message {
  return {
    role,
    text,
    id: crypto.randomUUID(),
  };
}
