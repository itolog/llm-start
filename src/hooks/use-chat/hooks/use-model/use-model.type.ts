export interface UseModelOptions {
  addMessage: (role: "You" | "Bot", text: string) => void;
  setModel: (model: string) => void;
  setTemp: (temp: number) => void;
}
