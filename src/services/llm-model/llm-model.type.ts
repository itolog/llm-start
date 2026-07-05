export interface OllamaTag {
  name: string;
  model: string;
}

export interface TranslateParams {
  text: string;
  fromLang: string;
  toLang: string;
  // External signal (component lifecycle / user cancel); combined with the
  // internal request timeout inside the service.
  signal?: AbortSignal;
}
