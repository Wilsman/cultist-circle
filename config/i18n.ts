import en from "./i18n/en.json5";
import fr from "./i18n/fr.json5";
import de from "./i18n/de.json5";
import es from "./i18n/es.json5";
import pt from "./i18n/pt.json5";
import it from "./i18n/it.json5";
import ru from "./i18n/ru.json5";
import zh from "./i18n/zh.json5";
import ja from "./i18n/ja.json5";
import ko from "./i18n/ko.json5";
import pl from "./i18n/pl.json5";
import cs from "./i18n/cs.json5";
import hu from "./i18n/hu.json5";

export const DEFAULT_LANGUAGE = "en";

export type MessageDictionary = Record<string, string>;

export const MESSAGES: Record<string, MessageDictionary> = {
  en: en as MessageDictionary,
  fr: fr as MessageDictionary,
  de: de as MessageDictionary,
  es: es as MessageDictionary,
  pt: pt as MessageDictionary,
  it: it as MessageDictionary,
  ru: ru as MessageDictionary,
  zh: zh as MessageDictionary,
  ja: ja as MessageDictionary,
  ko: ko as MessageDictionary,
  pl: pl as MessageDictionary,
  cs: cs as MessageDictionary,
  hu: hu as MessageDictionary,
};

export function getMessage(language: string, key: string): string {
  return MESSAGES[language]?.[key] ?? MESSAGES[DEFAULT_LANGUAGE]?.[key] ?? key;
}

export function formatMessage(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (!Object.prototype.hasOwnProperty.call(vars, key)) return match;
    return String(vars[key]);
  });
}
