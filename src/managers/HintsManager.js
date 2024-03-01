import {
    CLIENT_PACKET_TYPE, SERVER_PACKET_TYPE
} from "../consts/CommandPacketType.js";

/**
 * Manages and watches for hint events to this player slot and provides helper functions to make working with hints
 * easier.
 */
export class HintsManager {

    #client;

    #hints = [];

    constructor(client) {
        this.#client = client;
        this.#client.addEventListener(SERVER_PACKET_TYPE.SET_REPLY, this.#onSetReply);
        this.#client.addEventListener(SERVER_PACKET_TYPE.RETRIEVED, this.#onRetrieved);
        this.#client.addEventListener(SERVER_PACKET_TYPE.CONNECTED, this.#onConnected);
    }

    /**
     * Get all hints that are relevant for this slot.
     */
    get mine() {
        return this.#hints;
    }

    #onSetReply = ((event) => {
        const {data} = event;
        const [packet] = data;
        if (packet.key === `_read_hints_${this.#client.data.team}_${this.#client.data.slot}`) {
            this.#hints = packet.value;
        }
    }).bind(this);

    #onRetrieved = ((event) => {
        const {data} = event;
        const [packet] = data;
        for (const key in packet.keys) {
            if (key !== `_read_hints_${this.#client.data.team}_${this.#client.data.slot}`) {
                continue;
            }

            this.#hints = packet.keys[key];
        }
    }).bind(this);

    #onConnected = (() => {
        // Once connected, let's send out our set_notify for hints.
        this.#client.send(
            {
                cmd: CLIENT_PACKET_TYPE.SET_NOTIFY,
                keys: [`_read_hints_${this.#client.data.team}_${this.#client.data.slot}`]
            },
            {
                cmd: CLIENT_PACKET_TYPE.GET,
                keys: [`_read_hints_${this.#client.data.team}_${this.#client.data.slot}`]
            }
        );
    }).bind(this);

}
