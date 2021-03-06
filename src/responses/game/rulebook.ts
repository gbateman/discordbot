import { lang_type, isLangType, list, languageEnglish } from '../../common/languages';
const rulebooks = require('./config/rulebooks.json') as Record<lang_type, Record<string, string>>;

function rule_url(url: string) {
  return (`https://drive.google.com/file/d/${url}/view`);
}

export default function (args: string[], options: string[]) {
  if (options.includes('list')) {
    return list(rulebooks);
  }

  // Default is English AU
  if (args.length === 0) {
    return rule_url(rulebooks.EN.AU);
  }

  const lang = args[0].toUpperCase();
  if (isLangType(lang) && lang in rulebooks) {
    if (args.length === 1) {
      if ('AU' in rulebooks[lang]) {
        return rule_url(rulebooks[lang].AU);
      }
      else {
        return rule_url(rulebooks[lang].DOP);
      }
    }
    else {
      const set = args[1].toUpperCase();
      if (set in rulebooks[lang]) {
        return rule_url(rulebooks[lang][set]);
      }
      else {
        return `I don't have that set in ${languageEnglish(lang)}`;
      }
    }
  }
  else {
    return "I don't have a rulebook in that language";
  }
}
