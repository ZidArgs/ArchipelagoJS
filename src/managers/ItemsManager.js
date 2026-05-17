import {
    CLIENT_PACKET_TYPE, SERVER_PACKET_TYPE
} from "../consts/CommandPacketType.js";

/**
 * Manages and watches for events regarding item data and provides helper functions to make working with items easier.
 */
export class ItemsManager {

    #client;

    #items = [];

    #index = 0;

    /**
     * Creates a new {@link ItemsManager} and sets up events on the {@link Client} to listen for to start
     * updating its internal state.
     *
     * @param client The {@link Client} that should be managing this manager.
     */
    constructor(client) {
        this.#client = client;
        this.#client.addEventListener(SERVER_PACKET_TYPE.RECEIVED_ITEMS, this.#onReceivedItems);
    }

    /**
     * Returns the `name` of a given item `id`.
     *
     * @param value The `name` of the game OR the `id` of the player this item belongs to.
     * @param id The `id` of this item.
     * @returns Returns the name of the item or `Unknown Item: <id>` if item or player is not in data.
     *
     * @throws Throws an error if `player` or `id` is not a safe integer.
     */
    name(value, id) {
        if (isNaN(id) || !Number.isSafeInteger(id)) {
            throw new Error(`'id' must be a safe integer. Received: ${id}`);
        }

        let game;
        if (typeof value === "string") {
            game = value;
        } else {
            if (isNaN(value) || !Number.isSafeInteger(value)) {
                throw new Error(`'player' must be a safe integer. Received: ${id}`);
            }

            const player = this.#client.players.get(value);
            if (!player) {
                return `Could not resolve game of Player '${value}' while resolving Item: ${id}`;
            }

            game = player.game;
        }

        const gameData = this.#client.data.package.get(game);
        if (!gameData) {
            return `Could not resolve data of Game '${game}' while resolving Item: ${id}`;
        }

        const name = gameData.item_id_to_name[id];
        if (!name) {
            return `Could not resolve Item: ${id}`;
        }

        return name;
    }

    /**
     * Returns a list of all item names in a given group.
     *
     * @param game
     * @param name
     *
     * @throws Throws an error if unable to find game for group in data package.
     */
    group(game, name) {
        const gameData = this.#client.data.package.get(game);
        if (!gameData) {
            throw new Error(`Unknown Game: ${game}`);
        }

        const group = gameData.item_name_groups[name];
        if (!group) {
            return [];
        }

        return group;
    }

    /**
     * Returns the current item index. If this value is larger than expected, that means new items have been received.
     */
    get index() {
        return this.#index;
    }

    /**
     * Returns an array of all items that have been received.
     */
    get received() {
        return this.#items;
    }

    #onReceivedItems = ((event) => {
        const {data} = event;
        const [packet] = data;
        // De-sync occurred! Attempt a re-sync before continuing.
        if (packet.index > this.#index) {
            this.#index = 0;
            this.#client.send({cmd: CLIENT_PACKET_TYPE.SYNC});
            return;
        }

        let index = packet.index;
        for (const item of packet.items ?? []) {
            this.#items[index++] = item;
        }
    }).bind(this);

}
