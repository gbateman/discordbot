import { RichEmbed } from 'discord.js';
import { API, color } from '../../database';
import { Creature } from '../../definitions';
import { rndrsp } from '../../common';

export default function (name: string) {
  const results = API.find_cards_by_name(name, ['type=creature']) as Creature[];
  let card: Creature;

  if (!name) {
    do {
      card = rndrsp(results)
    } while (!card.gsx$avatar || !card.gsx$ia);
  }
  else if (results.length > 0) {
    card = results[0];
    if (!card.gsx$ia) {
      return `Sorry, I don't have ${card.gsx$name}'s avatar`;
    }
  }
  else {
    return "That's not a valid card name";
  }

  return new RichEmbed()
  .setColor(color(card))
  .setTitle(card.gsx$name)
  .setURL(API.cardAvatar(card))
  .setImage(API.cardAvatar(card));
}