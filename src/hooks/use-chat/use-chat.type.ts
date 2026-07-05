export interface UseChatOptions {
  fromLang: string;
  toLang: string;
  setFromLang: (lang: string) => void;
  setToLang: (lang: string) => void;
  setModel: (model: string) => void;
  setTemp: (temp: number) => void;
}
