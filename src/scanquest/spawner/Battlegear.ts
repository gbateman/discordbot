import { RichEmbed } from 'discord.js';
import { API } from '../../database';
import { Battlegear } from '../../definitions';
import { ScannableBattlegear } from '../scanner/Battlegear';
import ScanFunction from './ScanFunction';

export default class ScanBattlegear extends ScanFunction {
  private readonly battlegear: Battlegear[];

  constructor() {
    super();
    const battlegear = API.find_cards_by_name('', ['type=battlegear']) as Battlegear[];
    this.battlegear = battlegear.filter((battlegear) => (
      battlegear.gsx$splash && battlegear.gsx$splash !== '' &&
      battlegear.gsx$image && battlegear.gsx$image !== ''
    ));
  }

  generate(): [ScannableBattlegear, RichEmbed] {
    const battlegear = this.randomCard(this.battlegear) as Battlegear;
    const image = new RichEmbed()
    .setImage(API.base_image + battlegear.gsx$splash)
    .setURL(API.base_image + battlegear.gsx$splash);

    return [new ScannableBattlegear(battlegear), image];
  }
}
