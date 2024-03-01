import {
    Client
} from "./archipelago/Client.js";
import {
    SERVER_PACKET_TYPE
} from "./archipelago/consts/CommandPacketType.js";
import {
    COMMON_TAGS
} from "./archipelago/consts/CommonTags.js";
import {
    CREATE_AS_HINT_MODE
} from "./archipelago/consts/CreateAsHintMode.js";
import {
    ITEM_FLAGS
} from "./archipelago/consts/ItemFlags.js";
import {
    ITEMS_HANDLING_FLAGS
} from "./archipelago/consts/ItemsHandlingFlags.js";

// Create a new Archipelago client
const client = new Client();

const connectionInfo = {
    hostname: "archipelago.gg", // Replace with the actual AP server hostname.
    port: 53002, // Replace with the actual AP server port.
    // port: 36753, // Replace with the actual AP server port.
    game: "Ocarina of Time", // Replace with the game name for this player.
    name: "ZidArgs", // Replace with the player slot name.
    // name: "FreeMuffinOOT", // Replace with the player slot name.
    items_handling: ITEMS_HANDLING_FLAGS.REMOTE_ALL,
    slot_data: true,
    tags: [COMMON_TAGS.TRACKER]
};

let slotId;

// Set up event listeners

client.addEventListener(SERVER_PACKET_TYPE.DATA_PACKAGE, (event) => {
    const {data} = event;
    const [packet] = data;
    console.log("Data package: ", packet);
});

client.addEventListener(SERVER_PACKET_TYPE.PRINT_JSON, (event) => {
    const {data} = event;
    const [packet] = data;
    console.log("Message: ", packet);
});

client.addEventListener(SERVER_PACKET_TYPE.ROOM_INFO, (event) => {
    const {data} = event;
    const [packet] = data;
    console.log("Room info: ", packet);
});

client.addEventListener(SERVER_PACKET_TYPE.LOCATION_INFO, (event) => {
    const {data} = event;
    const [packet] = data;
    console.log("Location info: ", packet);
});

client.addEventListener(SERVER_PACKET_TYPE.CONNECTED, (event) => {
    const {data} = event;
    const [packet] = data;
    console.log("Connected to server: ", packet);

    const {slot, checked_locations} = packet;
    slotId = slot;
    for (const location of checked_locations) {
        const name = client.locations.name(slotId, location);
        console.log("checked location: ", name);
    }
    client.locations.scout(CREATE_AS_HINT_MODE.NO_HINT, ...checked_locations);
});

client.addEventListener(SERVER_PACKET_TYPE.RECEIVED_ITEMS, (event) => {
    const {data} = event;
    const [packet] = data;
    console.log("Received Items: ", packet);

    const {items} = packet;
    for (const itemEntry of items) {
        const {item, location, player, flags} = itemEntry;
        const itemName = client.items.name(slotId, item);
        const locationName = client.locations.name(player, location);
        const itemFlag = resolveItemFlag(flags);
        if (player === slotId) {
            console.log("found item {%s} at {%s} (%s)", itemName, locationName, itemFlag);
        } else {
            const playerName = client.players.name(player);
            console.log("recieved item {%s} from {%s} at {%s} (%s)", itemName, playerName, locationName, itemFlag);
        }
    }
});

client.addEventListener(SERVER_PACKET_TYPE.RETRIEVED, (event) => {
    const {data} = event;
    const [packet] = data;
    console.log("Retrieved: ", packet);
});

client.addEventListener(SERVER_PACKET_TYPE.ROOM_UPDATE, (event) => {
    const {data} = event;
    const [packet] = data;
    console.log("Room update: ", packet);
});

// Connect to the Archipelago server
client
    .connect(connectionInfo)
    .then(() => {
        console.log("Connected to the server");
        // You are now connected and authenticated to the server. You can add more code here if need be.
    })
    .catch((error) => {
        console.error("Failed to connect:", error);
        // Handle the connection error.
    });

// Disconnect from the server when unloading window.
window.addEventListener("beforeunload", () => {
    client.disconnect();
});

function resolveItemFlag(flags) {
    if (flags & ITEM_FLAGS.PROGRESSION) {
        return "progression";
    }
    if (flags & ITEM_FLAGS.NEVER_EXCLUDE) {
        return "useful";
    }
    if (flags & ITEM_FLAGS.TRAP) {
        return "trap";
    }
    return "filler";
}
