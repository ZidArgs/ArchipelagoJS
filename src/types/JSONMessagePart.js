/**
 * This is a const of all supported message types for denoting the intent of the message part. This can be used to
 * indicate special information which may be rendered differently depending on client.
 *
 * - `text`: Regular text content. Is the default type and as such may be omitted.
 * - `player_id`: Player id of someone on your team, should be resolved to player Name.
 * - `player_name`: Player Name, could be a player within a multiplayer game or from another team, not id resolvable.
 * - `item_id`: Item id, should be resolved to an item name.
 * - `item_name`: Item name, not currently used over network, but supported by reference clients.
 * - `location_id`: Location id, should be resolved to a location name.
 * - `location_name`: Location name, not currently used over network, but supported by reference clients.
 * - `entrance_name`: Entrance name. No id mapping exists.
 * - `color`: Regular text that should be colored. Only type that will contain color data.
 */
export const VALID_JSON_MESSAGE_TYPE = {
    TEXT: "text",
    PLAYER_ID: "player_id",
    PLAYER_NAME: "player_name",
    ITEM_ID: "item_id",
    ITEM_NAME: "item_name",
    LOCATION_ID: "location_id",
    LOCATION_NAME: "location_name",
    ENTRANCE_NAME: "entrance_name",
    COLOR: "color"
};
