export type Message = {
  role: "You" | "Bot";
  text: string;
  id: string;
};

export function createMessage(role: "You" | "Bot", text: string): Message {
  return {
    role,
    text,
    id: crypto.randomUUID(),
  };
}
