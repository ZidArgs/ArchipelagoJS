import {
    SERVER_PACKET_TYPE
} from "../consts/CommandPacketType.js";
import {
    PERMISSION
} from "../consts/Permission.js";
import {
    SLOT_TYPE
} from "../consts/SlotType.js";

/**
 * Manages and watches for events regarding session data and the data package. Most other mangers use this information
 * to create helper functions and track other information.
 */
export class DataManager {

    #client;

    #dataPackage = new Map();

    #players = [];

    #games = [];

    #hintCost = 0;

    #hintPoints = 0;

    #slotData = {};

    #slot = -1;

    #team = -1;

    #seed = "";

    #awaitingSetReplies = [];

    #permissions = {
        release: PERMISSION.DISABLED,
        collect: PERMISSION.DISABLED,
        remaining: PERMISSION.DISABLED
    };

    /**
     * Creates a new {@link DataManager} and sets up events on the {@link Client} to listen for to start
     * updating its internal state.
     * @param client The {@link Client} that should be managing this manager.
     */
    constructor(client) {
        this.#client = client;
        this.#client.addEventListener(SERVER_PACKET_TYPE.DATA_PACKAGE, this.#onDataPackage);
        this.#client.addEventListener(SERVER_PACKET_TYPE.CONNECTED, this.#onConnected);
        this.#client.addEventListener(SERVER_PACKET_TYPE.ROOM_INFO, this.#onRoomInfo);
        this.#client.addEventListener(SERVER_PACKET_TYPE.ROOM_UPDATE, this.#onRoomUpdate);
        this.#client.addEventListener(SERVER_PACKET_TYPE.SET_REPLY, this.#onSetReply);
    }

    /**
     * Returns a map of all {@link GamePackage} mapped to their game `name`.
     */
    get package() {
        return this.#dataPackage;
    }

    /**
     * Returns an array of all `players`, keyed by player id.
     */
    get players() {
        return this.#players;
    }

    /**
     * Returns an array of all games that exist in this room.
     */
    get games() {
        return this.#games;
    }

    /**
     * Returns how many hint points a player needs to spend to receive a hint.
     */
    get hintCost() {
        return this.#hintCost;
    }

    /**
     * Returns how many hint points a player has.
     */
    get hintPoints() {
        return this.#hintPoints;
    }

    /**
     * Returns the slot data for this game. Will be `undefined` if no connection has been established.
     */
    get slotData() {
        return this.#slotData;
    }

    /**
     * Returns this player's slot. Returns `-1` if player is not connected.
     */
    get slot() {
        return this.#slot;
    }

    /**
     * Returns this player's team. Returns `-1` if player is not connected.
     */
    get team() {
        return this.#team;
    }

    /**
     * Return the seed for this room.
     */
    get seed() {
        return this.#seed;
    }

    /**
     * Get the current permissions for the room.
     */
    get permissions() {
        return this.#permissions;
    }

    /**
     * Send a series of set operations to the server. Promise returns a {@link SetReplyPacket} if `want_reply` was
     * requested.
     *
     * @param setOperation The set builder to do operations on the data storage.
     */
    async set(setOperation) {
        const packet = setOperation.build();

        if (packet.want_reply) {
            return new Promise((resolve) => {
                this.#awaitingSetReplies.push({key: packet.key, resolve});
                this.#client.send(packet);
            });
        } else {
            this.#client.send(packet);
        }
    }

    #onSetReply = ((event) => {
        const {data} = event;
        const [packet] = data;
        const replyIndex = this.#awaitingSetReplies.findIndex((s) => s.key === packet.key);
        if (replyIndex !== -1) {
            const {resolve} = this.#awaitingSetReplies[replyIndex];

            // Remove the "await".
            this.#awaitingSetReplies.splice(replyIndex, 1);
            resolve(packet);
        }
    }).bind(this);

    #onDataPackage = ((event) => {
        const {data} = event;
        const [packet] = data;
        // TODO: Cache results.
        for (const game in packet.data.games) {
            const data = packet.data.games[game];
            this.#dataPackage.set(game, data);
            let createItemNameGroup = false;
            let createLocationNameGroup = false;

            // Check if these fields exist, if not, let's add them.
            if (!data.item_name_groups) {
                data.item_name_groups = {Everything: []};
                createItemNameGroup = true;
            }
            if (!data.location_name_groups) {
                data.location_name_groups = {Everywhere: []};
                createLocationNameGroup = true;
            }

            // Build reverse lookups for items and locations. (also add to Everywhere and Everything group if needed)
            data.location_id_to_name = {};
            data.item_id_to_name = {};
            for (const [name, id] of Object.entries(data.location_name_to_id)) {
                data.location_id_to_name[id] = name;
                if (createLocationNameGroup) {
                    data.location_name_groups["Everywhere"].push(name);
                }
            }
            for (const [name, id] of Object.entries(data.item_name_to_id)) {
                data.item_id_to_name[id] = name;
                if (createItemNameGroup) {
                    data.item_name_groups["Everything"].push(name);
                }
            }
        }
    }).bind(this);

    #onConnected = ((event) => {
        const {data} = event;
        const [packet] = data;
        // Archipelago player for slot 0 is implicitly the server.
        const players = [
            {
                name: "Archipelago",
                slot: 0,
                game: "Archipelago",
                team: 0,
                type: SLOT_TYPE.SPECTATOR,
                alias: "Archipelago",
                group_members: [],
                item: (id) => this.#client.items.name(0, id),
                location: (id) => this.#client.locations.name(0, id)
            }
        ];

        // Add all players.
        for (const networkPlayer of packet.players ?? []) {
            const player = {
                ...networkPlayer,
                // Can always assume this info will be filled out.
                ...packet.slot_info[networkPlayer.slot],
                item: (id) => this.#client.items.name(networkPlayer.slot, id),
                location: (id) => this.#client.locations.name(networkPlayer.slot, id)
            };

            players[player.slot] = player;
        }

        this.#players = players;
        this.#slot = packet.slot;
        this.#team = packet.team;
        this.#hintPoints = packet.hint_points ?? 0;
        this.#slotData = packet.slot_data;
    }).bind(this);

    #onRoomInfo = ((event) => {
        const {data} = event;
        const [packet] = data;
        this.#seed = packet.seed_name;
        this.#hintCost = packet.hint_cost;
        this.#permissions = packet.permissions;
        this.#games = packet.games;

        // We are ready to finalize connection.
        this.#client.emitRawEvent("__onRoomInfoLoaded");
    }).bind(this);

    #onRoomUpdate = ((event) => {
        const {data} = event;
        const [packet] = data;
        if (packet.hint_points) {
            this.#hintPoints = packet.hint_points;
        }

        if (packet.hint_cost) {
            this.#hintCost = packet.hint_cost;
        }

        if (packet.permissions) {
            this.#permissions = packet.permissions;
        }

        if (packet.players) {
            for (const player of packet.players) {
                this.#players[player.slot] = {...this.#players[player.slot], ...player};
            }
        }
    }).bind(this);

}
