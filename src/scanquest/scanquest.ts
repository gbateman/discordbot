import {RichEmbed} from 'discord.js';
import {Client} from 'discord.js';
import API from '../database/Api';
import { Creature } from '../definitions';
import servers from '../common/servers';

const config = {
    "default_channel": servers("main").channel("bot_commands"),
    "test_channel": servers("develop").channel("bot_commands")
}

export default class ScanQuest {
    bot: Client;
    channel: string;
    creatures: Creature[];
    timeout: NodeJS.Timeout;
    last: number = -1;

    constructor(bot: Client) {
        this.bot = bot;
        this.channel = (process.env.NODE_ENV != "development") ? config.default_channel : config.test_channel;
    }

    start() {
        // Check to see if database has been initialized
        if (!API.data) {
            // Try again in a second
            this.timeout = setTimeout(() => {this.start()}, 1000);
            return;
        }
        if (API.data === "local") return;
        const creatures: Creature[] = API.find_cards_by_name("", ["type=creature"]);
        this.creatures = creatures.filter((creature) =>
            creature.gsx$avatar && creature.gsx$avatar !== ""
        );
        this.randomTime(30, 60);
    }

    stop() {
        clearTimeout(this.timeout);
    }

    /**
     * Takes a min and max number in minutes and 
     * sets the next iterval to send a creature
     */
    randomTime(min: number, max: number): void {
        const interval = Math.floor(((Math.random() * (max - min)) + min) * 60) * 1000;
        this.timeout = setTimeout(() => {this.sendCreature()}, interval);
    }

    /**
     * Returns a creature to send to the channel
     */
    randomCreature(): Creature {
        let rnd;
        do {
            rnd = Math.floor(Math.random() * this.creatures.length);
        } while (rnd === this.last);
        this.last = rnd;
        return this.creatures[rnd];
    }

    sendCreature() {
        const creature = this.randomCreature();

        const message = new RichEmbed()
            .setImage(API.base_image + creature.gsx$avatar);

        // @ts-ignore bot will always be defined
        this.bot.channels.get(this.channel).send(message);

        this.randomTime(60, 300);
    }
}