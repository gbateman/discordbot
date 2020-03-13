const { languages, rulebook } = require('../config/rulebooks.json');

function rule_url(url: string) {
  return (`https://drive.google.com/file/d/${url}/view`);
}

export default function (args: string[], options: string[]) {
  let message = '';
  if (options.includes('list')) {
    for (const lan in languages) {
      message += `**${languages[lan]}**\n    ${lan} [`;

      for (const set in rulebook[lan]) {
        message += `${set}, `;
      }
      message = message.slice(0, -2);
      message += ']\n';
    }
    return message;
  }

  // Default is English AU
  if (args.length === 0) {
    return rule_url(rulebook.EN.AU);
  }

  const lang = args[0].toUpperCase();
  if ({}.hasOwnProperty.call(rulebook, lang)) {
    if (args.length === 1) {
      if ({}.hasOwnProperty.call(rulebook[lang], 'AU')) {
        return rule_url(rulebook[lang].AU);
      }
      else {
        return rule_url(rulebook[lang].DOP);
      }
    }
    else {
      const set = args[1].toUpperCase();
      if ({}.hasOwnProperty.call(rulebook[lang], set)) {
        return rule_url(rulebook[lang][set]);
      }
      else {
        return `I don't have that set in ${languages[lang]}`;
      }
    }
  }
  else {
    return "I don't have a rulebook in that language";
  }
}