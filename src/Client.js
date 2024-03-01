import EventEmitter from "./util/EventEmitter.js";
import {
    uuid4
} from "./util/uuid4.js";
import {
    CLIENT_PACKET_TYPE, SERVER_PACKET_TYPE
} from "./consts/CommandPacketType.js";
import {
    CONNECTION_STATUS
} from "./consts/ConnectionStatus.js";
import {
    PRINT_JSON_TYPE
} from "./consts/PrintJSONType.js";
import {
    DataManager
} from "./managers/DataManager.js";
import {
    HintsManager
} from "./managers/HintsManager.js";
import {
    ItemsManager
} from "./managers/ItemsManager.js";
import {
    LocationsManager
} from "./managers/LocationsManager.js";
import {
    PlayersManager
} from "./managers/PlayersManager.js";
import {
    VALID_JSON_MESSAGE_TYPE
} from "./types/JSONMessagePart.js";

/**
 * The client that connects to an Archipelago server and facilitates communication, listens for events, and manages
 * data.
 */
export class Client extends EventTarget {

    #socket;

    #status = CONNECTION_STATUS.DISCONNECTED;

    #emitter = new EventEmitter();

    #dataManager = new DataManager(this);

    #hintManager = new HintsManager(this);

    #itemsManager = new ItemsManager(this);

    #locationsManager = new LocationsManager(this);

    #playersManager = new PlayersManager(this);

    /**
     * Get the current WebSocket connection status to the Archipelago server.
     */
    get status() {
        return this.#status;
    }

    /**
     * Get the {@link DataManager} helper object. See {@link DataManager} for additional information.
     */
    get data() {
        return this.#dataManager;
    }

    /**
     * Get the {@link HintsManager} helper object. See {@link HintsManager} for additional information.
     */
    get hints() {
        return this.#hintManager;
    }

    /**
     * Get the {@link ItemsManager} helper object. See {@link ItemsManager} for additional information.
     */
    get items() {
        return this.#itemsManager;
    }

    /**
     * Get the {@link LocationsManager} helper object. See {@link LocationsManager} for additional information.
     */
    get locations() {
        return this.#locationsManager;
    }

    /**
     * Get the {@link PlayersManager} helper object. See {@link PlayersManager} for additional information.
     */
    get players() {
        return this.#playersManager;
    }

    /**
     * Get the URI of the current connection, including protocol.
     */
    get uri() {
        if (this.#socket) {
            return this.#socket.url;
        }
        return null;
    }

    /**
     * Connects to the given address with given connection information.
     *
     * @param info All the necessary connection information to connect to an Archipelago server.
     *
     * @resolves On successful connection and authentication to the room.
     * @rejects If web socket connection failed to establish connection or server refused connection, promise will
     * return a `string[]` of error messages.
     */
    async connect(info) {
        // Confirm a valid port was given.
        if (info.port < 1 || info.port > 65535 || !Number.isInteger(info.port)) {
            throw new Error(`Port must be an integer between 1 and 65535. Received: ${info.port}`);
        }

        try {
            // First establish the initial connection.
            this.#status = CONNECTION_STATUS.CONNECTING;

            if (info.protocol === "ws") {
                await this.#connectSocket(`ws://${info.hostname}:${info.port}/`);
            } else if (info.protocol === "wss") {
                await this.#connectSocket(`wss://${info.hostname}:${info.port}/`);
            } else {
                try {
                    // Attempt a secure connection first.
                    await this.#connectSocket(`wss://${info.hostname}:${info.port}/`);
                } catch {
                    // Failing that, attempt to connect to normal websocket.
                    await this.#connectSocket(`ws://${info.hostname}:${info.port}/`);
                }
            }

            // Wait for data package to complete, then finalize connection.
            return await new Promise((resolve, reject) => {
                const onDataPackageLoaded = (() => {
                    this.#finalizeConnection(info)
                        .then((connectPacket) => {
                            this.#emitter.removeEventListener("__onRoomInfoLoaded", onDataPackageLoaded);
                            resolve(connectPacket);
                        })
                        .catch((error) => reject(error));
                }).bind(this);

                this.#emitter.addEventListener("__onRoomInfoLoaded", onDataPackageLoaded);
            });
        } catch (error) {
            this.disconnect();
            throw error;
        }
    }

    /**
     * Not meant for users of archipelago.js to use, just an easy way for me to pass events around.
     *
     * @internal
     */
    emitRawEvent(event, ...args) {
        this.#emitter.emit(event, ...args);
    }

    #finalizeConnection(info) {
        const version = info.version ?? MINIMUM_SUPPORTED_AP_VERSION;

        return new Promise((resolve, reject) => {
            // Successfully connected!
            const onConnectedListener = ((event) => {
                const {data} = event;
                const [packet] = data;
                this.#status = CONNECTION_STATUS.CONNECTED;
                this.removeEventListener(SERVER_PACKET_TYPE.CONNECTED, onConnectedListener);
                resolve(packet);
            }).bind(this);

            const onConnectionRefusedListener = ((event) => {
                const {data} = event;
                const [packet] = data;
                this.disconnect();
                reject(packet.errors);
            }).bind(this);

            this.addEventListener(SERVER_PACKET_TYPE.CONNECTED, onConnectedListener);
            this.addEventListener(SERVER_PACKET_TYPE.CONNECTION_REFUSED, onConnectionRefusedListener);

            // Get the data package and connect to room.
            this.send(
                {
                    cmd: CLIENT_PACKET_TYPE.GET_DATA_PACKAGE,
                    games: this.#dataManager.games
                },
                {
                    cmd: CLIENT_PACKET_TYPE.CONNECT,
                    game: info.game,
                    name: info.name,
                    version: {...version, class: "Version"},
                    items_handling: info.items_handling,
                    uuid: info.uuid ?? uuid4(),
                    tags: info.tags ?? [],
                    password: info.password ?? ""
                }
            );
        });
    }

    /**
     * Send a list of raw packets to the Archipelago server in the order they are listed as arguments.
     *
     * @param packets An array of raw {@link ClientPacket}s to send to the AP server. They are processed in
     * the order they are listed as arguments.
     */
    send(...packets) {
        this.#socket?.send(JSON.stringify(packets));
    }

    /**
     * Send a normal chat message to the server.
     * @param message The message to send.
     */
    say(message) {
        this.send({cmd: CLIENT_PACKET_TYPE.SAY, text: message});
    }

    /**
     * Update the status for this client.
     * @param status The status code to send.
     */
    updateStatus(status) {
        this.send({cmd: CLIENT_PACKET_TYPE.STATUS_UPDATE, status});
    }

    /**
     * Disconnect from the server and re-initialize all managers.
     */
    disconnect() {
        this.#socket?.close();
        this.#socket = undefined;
        this.#status = CONNECTION_STATUS.DISCONNECTED;
        this.#emitter.removeAllEventListeners();

        // Reinitialize our Managers.
        this.#dataManager = new DataManager(this);
        this.#hintManager = new HintsManager(this);
        this.#itemsManager = new ItemsManager(this);
        this.#locationsManager = new LocationsManager(this);
        this.#playersManager = new PlayersManager(this);
    }

    /**
     * Add an eventListener to fire depending on an event from the Archipelago server or the client.
     *
     * @param event The event to listen for.
     * @param listener The listener callback function to run when an event is fired.
     */
    addEventListener(event, listener) {
        this.#emitter.addEventListener(event, listener);
    }

    /**
     * Remove an eventListener from this client's event emitter.
     *
     * @param event The event to stop listening for.
     * @param listener The listener callback function to remove.
     */
    removeEventListener(event, listener) {
        this.#emitter.removeEventListener(event, listener);
    }

    #connectSocket(uri) {
        return new Promise((resolve, reject) => {
            this.#socket = new WebSocket(uri);

            // On successful connection.
            this.#socket.onopen = () => {
                this.#status = CONNECTION_STATUS.WAITING_FOR_AUTH;

                if (this.#socket) {
                    this.#socket.onmessage = this.#parsePackets.bind(this);
                    resolve();
                } else {
                    reject(["Socket was closed unexpectedly."]);
                }
            };

            // On unsuccessful connection.
            this.#socket.onerror = (event) => {
                this.#status = CONNECTION_STATUS.DISCONNECTED;
                reject([event]);
            };
        });
    }

    #parsePackets(event) {
        // Parse packets and fire our PacketReceived event for each packet.
        const packets = JSON.parse(event.data.toString());
        for (const packet of packets) {
            // Regardless of what type of event this is, we always emit the PacketReceived event.
            this.#emitter.emit("PacketReceived", packet);

            switch (packet.cmd) {
                case SERVER_PACKET_TYPE.INVALID_PACKET:
                    this.#emitter.emit(SERVER_PACKET_TYPE.INVALID_PACKET, packet);
                    break;
                case SERVER_PACKET_TYPE.BOUNCED:
                    this.#emitter.emit(SERVER_PACKET_TYPE.BOUNCED, packet);
                    break;
                case SERVER_PACKET_TYPE.CONNECTION_REFUSED:
                    this.#emitter.emit(SERVER_PACKET_TYPE.CONNECTION_REFUSED, packet);
                    break;
                case SERVER_PACKET_TYPE.CONNECTED:
                    this.#emitter.emit(SERVER_PACKET_TYPE.CONNECTED, packet);
                    break;
                case SERVER_PACKET_TYPE.DATA_PACKAGE:
                    this.#emitter.emit(SERVER_PACKET_TYPE.DATA_PACKAGE, packet);
                    break;
                case SERVER_PACKET_TYPE.LOCATION_INFO:
                    this.#emitter.emit(SERVER_PACKET_TYPE.LOCATION_INFO, packet);
                    break;
                case SERVER_PACKET_TYPE.RECEIVED_ITEMS:
                    this.#emitter.emit(SERVER_PACKET_TYPE.RECEIVED_ITEMS, packet);
                    break;
                case SERVER_PACKET_TYPE.RETRIEVED:
                    this.#emitter.emit(SERVER_PACKET_TYPE.RETRIEVED, packet);
                    break;
                case SERVER_PACKET_TYPE.ROOM_INFO:
                    this.#emitter.emit(SERVER_PACKET_TYPE.ROOM_INFO, packet);
                    break;
                case SERVER_PACKET_TYPE.ROOM_UPDATE:
                    this.#emitter.emit(SERVER_PACKET_TYPE.ROOM_UPDATE, packet);
                    break;
                case SERVER_PACKET_TYPE.SET_REPLY:
                    this.#emitter.emit(SERVER_PACKET_TYPE.SET_REPLY, packet);
                    break;
                case SERVER_PACKET_TYPE.PRINT_JSON: {
                    // Add the plain text version of entire message for easy access.
                    this.#emitter.emit(SERVER_PACKET_TYPE.PRINT_JSON, packet, this.#consolidateMessage(packet));
                    break;
                }
            }
        }
    }

    #consolidateMessage(packet) {
        // If we're lucky, we can take a shortcut.
        if (packet.type === PRINT_JSON_TYPE.CHAT || packet.type === PRINT_JSON_TYPE.SERVER_CHAT) {
            return packet.message;
        }

        // I guess not, let's reduce through and create message, replacing text as needed if we run into any ids.
        return packet.data.reduce((string, piece) => {
            switch (piece.type) {
                case VALID_JSON_MESSAGE_TYPE.PLAYER_ID:
                    return string + this.players.alias(parseInt(piece.text));

                case VALID_JSON_MESSAGE_TYPE.LOCATION_ID:
                    return string + this.players.get(piece.player)?.location(parseInt(piece.text));

                case VALID_JSON_MESSAGE_TYPE.ITEM_ID:
                    return string + this.players.get(piece.player)?.item(parseInt(piece.text));

                default:
                    return string + piece.text;
            }
        }, "");
    }

}

/** Minimum supported version of Archipelago this library supports. */
export const MINIMUM_SUPPORTED_AP_VERSION = {
    major: 0,
    minor: 4,
    build: 2
};
