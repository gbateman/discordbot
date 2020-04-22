import { RichEmbed } from 'discord.js';
import { API } from '../../database';
import { Location } from '../../definitions';
import { ScannableLocation } from '../scanner/Location';
import ScanFunction from './ScanFunction';

export default class ScanLocation extends ScanFunction {
  private readonly locations: Location[];

  constructor() {
    super();
    const locations = API.find_cards_by_name('', ['type=location']) as Location[];
    this.locations = locations.filter((location) => (
      location.gsx$splash && location.gsx$splash !== '' &&
      location.gsx$image && location.gsx$image
    ));
  }

  generate(): [ScannableLocation, RichEmbed] {
    const location = this.randomCard(this.locations) as Location;
    const image = new RichEmbed()
    .setImage(API.base_image + location.gsx$splash)
    .setURL(API.base_image + location.gsx$splash);

    return [new ScannableLocation(location), image];
  }
}
