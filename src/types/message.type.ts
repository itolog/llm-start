export type Message = {
  role: "You" | "Bot";
  text: string;
  id: string;
  // Creation time (epoch ms) — rendered as HH:MM in the card title.
  createdAt: number;
};
