export type Command =
  | { type: "from"; lang: string }
  | { type: "to"; lang: string }
  | { type: "clear" }
  | { type: "help" }
  | { type: "exit" }
  | { type: "translate"; text: string }
  | { type: "error"; message: string };
