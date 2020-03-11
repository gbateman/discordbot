/* eslint-disable @typescript-eslint/no-floating-promises */
import { Client, Guild, GuildMember, Message, RichEmbed } from 'discord.js';
import { Logger } from 'winston';

import { can_send, hasPermission, isModerator, rndrsp, cleantext, flatten } from '../common';
import servers from '../common/servers';
import users from '../common/users';
import parseCommand from '../common/parse_command';

import { API } from '../database';
import { Channel, SendFunction } from '../definitions';

import { display_card, find_card, full_art, rate_card, display_token } from './card';

import { banlist, formats, whyban } from './game/bans';
import { cr, faq } from './game/faq';
import glossary from './game/glossary';
import { funstuff, goodstuff } from './game/goodstuff';
import { cancelMatch, lookingForMatch } from './misc/match_making';
import tier from './game/meta';
import rulebook from './game/rulebook';
import starters from './game/starters';

import meetup from './joinable/regions';
import speakers from './joinable/speakers';
import { brainwash, tribe } from './joinable/tribes';

import color from './misc/color';
import gone from './misc/gone';
import help from './misc/help';
import { compliment, insult } from './misc/insult_compliment';
import { whistle, trivia, answer } from './misc/trivia';
import { make, menu, order } from './misc/menu';
import nowornever from './misc/nowornever';

import checkSass from './sass';
import logs from './logs';

const joke = require('./config/jokes.json');

const development = (process.env.NODE_ENV === 'development');

// Servers which have access to the full command list
const full_command_servers = [
  servers('main').id, servers('develop').id, servers('international').id, servers('unchained').id
];

export default (async function (bot: Client, message: Message, logger: Logger): Promise<void> {
  // Ignore bot messages
  if (message.author.bot) return;

  const content: string = message.content;
  const mentions: string[] = Array.from(message.mentions.users.keys());

  // Prevents sending an empty message
  const send: SendFunction = async (msg, options) => {
    if (msg) return message.channel.send(msg, options).catch(error => logger.error(error.stack));
  }

  const response = async (): Promise<void> => {
    // Dev command prefix
    if (development && content.substring(0, 2) === 'd!')
      return command_response(bot, message, mentions, send);

    // Prevents double bot responses on production servers
    if (development && (!message.guild || message.guild.id !== servers('develop').id))
      return;

    // If the message is a command
    if (content.charAt(0) === '!' || content.substring(0, 2).toLowerCase() === 'c!')
      return command_response(bot, message, mentions, send);

    // If no commands check message content for quips
    if (message.guild &&
      (message.guild.id === servers('main').id || message.guild.id === servers('develop').id)
    ) return checkSass(bot, message, mentions, send);
  };

  return response()
  .catch((error) => {
    // Log/Print error
    logger.error(error.stack);

    // Don't log problems while in development
    if (development) return;

    // Send Error to Bot Testing Server
    const server_source = message.guild ? message.guild.name : 'DM';

    (bot.channels.get(servers('develop').channel('errors')) as Channel)
    .send(`${server_source}:\n${error.stack}`);

    // Ignore programmer errors (keep running)
    if (error.name === 'ReferenceError' || error.name === 'SyntaxError')
      return;

    // restart bot if unknown error
    bot.destroy();
  });
});

/**
 * Switch statement for commands
 * @param bot
 * @param mentions
 * @param message
 * @param send
 */
const command_response = async (bot: Client, message: Message, mentions: string[], send: SendFunction): Promise<void> => {
  const content: string = message.content;

  const { cmd, args, options } = parseCommand(content);

  if (options.includes('help'))
    return send(help(cmd));

  /**
    * Public Servers (Limited functions)
    */
  if (message.guild && !full_command_servers.includes(message.guild.id)) {
    switch (cmd) {
      case 'card':
      case 'cards':
        return flatten(args).split(';').forEach((name: string) => {
          send(display_card(name.trim(), options, bot));
        });
      case 'ability':
        options.push('ability');
        return send(display_card(flatten(args), options, bot));
      case 'text':
        options.push('text');
        return send(display_card(flatten(args), options, bot));
      case 'stats':
        options.push('stats');
        return send(display_card(flatten(args), options, bot));
      case 'full':
      case 'fullart':
        return send(full_art(flatten(args), options));
      case 'find':
        return send(find_card(flatten(args)));
      case 'rate':
        return send(rate_card(flatten(args), options, bot));
      case 'help':
        if (content.charAt(0) === '!')
          return send('Use **!commands** or **c!help**');
        // falls through with c!help
      case 'commands':
        const text = flatten(args);
        if (text) return send(help(text));
        const keys = ['start', 'card', 'stats', 'text', 'fullart', 'find', 'rate', 'end'];
        const msg = `${help('', keys)
        }\nFor my full feature set check out the main server https://discord.gg/chaotic`;
        return send(msg)
        .then(async () => send(donate()));
      default:
        return;
    }
  }

  const channel = message.channel;
  const { guild, guildMember } = await messageGuild(message) as {guild: Guild, guildMember: GuildMember};

  /**
    * Special server exclusive commands
    */
  if (guild && (
    guild.id === servers('international').id
      || guild.id === servers('unchained').id
      || guild.id === servers('develop').id
  )
  ) {
    switch (cmd) {
      case 'colour':
      case 'color':
        return color(args, guild, guildMember, send);
      case 'region':
      case 'regions':
        return meetup(guildMember, guild, args, mentions).then(send);
      case 'watch':
        return send('Season 1: https://www.youtube.com/playlist?list=PL0qyeKPgEbR7bSU1LkQZDw3CjkSzChI-s\n'
          + 'Season 2: https://www.youtube.com/playlist?list=PL0qyeKPgEbR7Fs9lSsfTEjODyoXWdXP6i\n'
          + 'Season 3: https://www.youtube.com/playlist?list=PL0qyeKPgEbR5qdu0i9cyxl8ivUdxihAc4'
        );
      default:
        // If no special commands, continue to full command set
        break;
    }
  }

  /**
    * Full command set
    */
  switch (cmd) {
  /*
   * Gameplay
   */

    /* Cards */
    case 'card':
    case 'cards':
      if (guildMember && guildMember.roles.size === 1 && !can_send(message)) break;
      return flatten(args).split(';').forEach((name: string) => {
        send(display_card(name.trim(), options, bot));
      });
    case 'ability':
      options.push('ability');
      return send(display_card(flatten(args), options, bot));
    case 'text':
      options.push('text');
      return send(display_card(flatten(args), options, bot));
    case 'stats':
      options.push('stats');
      return send(display_card(flatten(args), options, bot));
    case 'full':
    case 'fullart':
      return send(full_art(flatten(args), options));
    case 'altart':
      options.push('alt');
      return send(full_art(flatten(args), options));
    case 'find':
      return send(find_card(flatten(args)));
    case 'rate':
      return send(rate_card(flatten(args), options, bot));
    case 'readthecard':
      if (isModerator(guildMember) && hasPermission(guild, 'SEND_TTS_MESSAGES')) {
        options.push('read');
        return send(display_card(flatten(args), options, bot), { tts: true });
      }
      return;
    case 'parasite': {
      if (args[0] === 'token')
        return send(display_token(`parasite ${flatten(args.slice(1))}`));

      else
        return send(display_token(`parasite ${flatten(args)}`));
    }
    case 'token': {
      return send(display_token(flatten(args)));
    }

    /* Rules */
    case 'faq':
      return send(faq(flatten(args)));
    case 'keyword':
    case 'rule':
      if (args.length < 1)
        return send('Please provide a rule, or use **!rulebook** or **!guide**');
      return send(glossary(flatten(args)));

    /* Documents */
    case 'rulebook':
      return send(rulebook(args, options));
    case 'cr':
      if (args.length > 0) {
        return send(cr(flatten(args)));
      } // fallthrough
    case 'comprehensive':
      return send('<https://drive.google.com/file/d/1BFJ2lt5P9l4IzAWF_iLhhRRuZyNIeCr-/view>');
    case 'errata':
      return send('<https://drive.google.com/file/d/1eVyw_KtKGlpUzHCxVeitomr6JbcsTl55/view>');
    case 'guide':
      return send('<https://docs.google.com/document/d/1WJZIiINLk_sXczYziYsizZSNCT3UUZ19ypN2gMaSifg/view>');

    /* Starters */
    case 'starter':
    case 'starters':
      return send(starters(options));

    /* Banlist and Formats */
    case 'banlist':
      return send(banlist(guild, channel, options));
    case 'standard':
      return send(banlist(guild, channel));
    case 'legacy':
      return send(banlist(guild, channel, ['legacy']));
    case 'rotation':
    case 'modern':
      return send(banlist(guild, channel, ['modern']));
    case 'pauper':
      return send(banlist(guild, channel, ['pauper']));
    case 'peasant':
    case 'noble':
      return send(banlist(guild, channel, ['noble']));

    /* Whyban */
    case 'ban':
      if (mentions.length > 0) {
        if (mentions.indexOf('279331985955094529') !== -1)
          return send("You try to ban me? I'll ban you!");
        return send("I'm not in charge of banning players");
      } // fallthrough
    case 'whyban':
      if (mentions.length > 0)
        return send("Player's aren't cards, silly");
      return send(whyban(flatten(args), guild, channel, options));
    case 'formats':
      return send(formats());

    /* Goodstuff */
    case 'strong':
    case 'good':
    case 'goodstuff':
      return send(goodstuff(args));

    /* Meta and Tierlist */
    case 'tier':
    case 'meta':
      if (args.length === 0)
        return send('Supply a tier or use ``!tierlist``');
      // falls through if args
    case 'tierlist':
      if (args.length > 0) return send(tier(flatten(args)));
      if (can_send(message)) {
        return send(new RichEmbed()
        .setImage('https://drive.google.com/uc?id=14l0YvLk-l0G5BaDeW8MFAMKrbBmMpQp5')
        )
        .then(async () => send(tier()))
        .then(async () => send(donate()));
      }
      return;
    /* Matchmaking */
    case 'lf':
    case 'lookingfor':
    case 'match':
      return send(lookingForMatch(args[0], channel, guild, guildMember));
    case 'cancel':
      return send(cancelMatch(channel, guild, guildMember));

      /*
   * Misc
   */
    case 'donate':
      return send(donate());

    case 'collection':
      return send('https://chaoticbackup.github.io/collection/');

    case 'banhammer': {
      return send(display_card('The Doomhammer', ['image'], bot));
    }

    case 'fun':
    case 'funstuff':
    case 'agame':
      return send(funstuff());

    /* Cooking */
    case 'menu':
      return send(menu());
    case 'order':
      return send(order(flatten(args)));
    case 'make':
    case 'cook':
      if (flatten(args) === 'sandwitch')
        return send(display_card('Arkanin', ['image'], bot));
      else
        return send(make(flatten(args)));

    /* Tribes */
    case 'tribe':
      return tribe(guild, guildMember, args).then(send);
    case 'bw':
    case 'brainwash':
      return brainwash(guild, guildMember, mentions).then(send);

    /* Languages */
    case 'speak':
    case 'speaker':
    case 'speakers':
    case 'language':
    case 'languages':
      return send(speakers(guildMember, guild, args));

    /* Now or Never */
    case 'never':
    case 'nowornever':
      return send(nowornever(flatten(args)));

    /* Gone Chaotic (fan) */
    case 'gone':
    case 'fan':
    case 'unset':
      return send(gone(flatten(args), bot));

    /* Compliments, Insults, Jokes */
    case 'flirt':
    case 'compliment':
      return send(compliment(guild, mentions, args.join(' ')));
    case 'burn':
    case 'roast':
    case 'insult':
      return send(insult(guild, mentions, args.join(' ')));
    case 'joke':
      return send(rndrsp(joke, 'joke'));

    /* Trivia */
    case 'whistle':
      return send(whistle(guildMember));
    case 'trivia':
      return send(trivia(guildMember));
    case 'answer':
      return send(answer(guildMember || message.author, args.join(' ')));

    case 'happy': {
      if (cleantext(flatten(args)).includes('borth'))
        return send(gone('borth-day', bot));

      break;
    }

    /* Help */
    case 'help':
      if (guildMember && content.charAt(0) === '!') {
        const rtn_str = 'Use **!commands** or **c!help**';
        if (bot.users.get('159985870458322944')) // meebot
          setTimeout(() => { send(rtn_str) }, 500);
        else
          send(rtn_str);
        break;
      } // falls through with c!help
    case 'cmd':
    case 'commands': {
      if (args.length > 0) return send(help(flatten(args)));
      if (guildMember) {
        return guildMember.send(help())
        .then(() => { guildMember.send(donate()) })
        .catch(() => {
          send(help());
        });
      }
      return send(help())
      .then(async () => send(donate()));
    }

    /*
   * Moderation
   */
    // case 'banhammer': {
    //   if (isModerator(guildMember) && mentions.length > 1) {
    //     message.mentions.members.forEach(member => {
    //       const reason = args.join(" ");
    //       if (!isModerator(member) && member.bannable) {
    //         if (reason !== "") member.ban({reason});
    //         else member.ban();
    //       }
    //       else {
    //         send(member.displayName + "cannot be banned");
    //       }
    //     });
    //   }
    //   return send(display_card("The Doomhammer", ["image"], bot));
    // }

    case 'rm':
      if (isNaN(parseInt(flatten(args))))
        return rm(bot, message);
    // fallthrough if number provided
    case 'clear':
    case 'clean':
    case 'delete':
      return clear(parseInt(flatten(args)), message, mentions);

      /* Hard reset bot */
    case 'haxxor':
      return haxxor(message, bot);

    case 'logs':
      return send(logs(message));

      // Not a recognized command
    default:
  }
}

/*
* Support Functions
*/

function donate(): RichEmbed {
  return (
    new RichEmbed()
    .setDescription('[Support the development of Chaotic BackTalk](https://www.paypal.me/ChaoticBackup)')
    .setTitle('Donate')
  );
}

/**
 * If the message was sent in a guild, returns the `guild` and `guildMember`
 */
async function messageGuild(message: Message):
Promise<{guild: Guild | null, guildMember: GuildMember | null}>
{
  if (!message.guild) return { guild: null, guildMember: null };

  const guild: Guild = message.guild;
  const guildMember: GuildMember = (message.member)
    ? message.member
    : await guild.fetchMember(message.author).then((member) => member);

  return { guild: guild, guildMember: guildMember };
}

function rm(bot: Client, message: Message) {
  const lstmsg = bot.user.lastMessage;
  if (lstmsg?.deletable) lstmsg.delete();
  if (message.deletable) message.delete(); // delete user msg
}

async function clear(amount: number, message: Message, mentions: string[] = []): Promise<void> {
  if (isModerator(message.member) && hasPermission(message.guild, 'MANAGE_MESSAGES')) {
    if (amount <= 25) {
      if (mentions.length > 0) {
        return message.channel.fetchMessages()
        .then(messages => {
          const b_messages = messages.filter(m =>
            mentions.includes(m.author.id)
          );
          if (b_messages.size > 0) {
            message.channel.bulkDelete(b_messages);
          }
          message.delete();
        });
      }
      else {
        message.channel.bulkDelete(amount + 1).catch();
      }
    }
    else {
      // only delete the clear command
      message.channel.send('Enter a number less than 20');
      message.delete();
    }
  }
}

function haxxor(message: Message, bot: Client): void {
  if (message.member.id === users('daddy')
    || (message.guild && message.guild.id === servers('main').id && isModerator(message.member))
  ) {
    message.channel.send('Resetting...');
    API.rebuild()
    .then(async () => bot.destroy())
    .catch((err) => {
      message.channel.send(err.message);
    });
  }
}
