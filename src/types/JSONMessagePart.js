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

/**
 * This is a const of all supported "colors" denoting a console color to display the message part with and is only
 * sent if the `type` is `color`. This is limited to console colors due to backwards compatibility needs with games such
 * as `A Link to the Past`. Although background colors as well as foreground colors are listed, only one may be applied
 * to a {@link JSONMessagePart} at a time.
 */
export const VALID_JSON_COLOR_TYPE = {
    // Yes, 'bold' and 'underline' are colors. Deal with it.
    BOLD: "bold",
    UNDERLINE: "underline",

    BLACK: "black",
    RED: "red",
    GREEN: "green",
    YELLOW: "yellow",
    BLUE: "blue",
    MAGENTA: "magenta",
    CYAN: "cyan",
    WHITE: "white",
    BLACK_BACKGROUND: "black_bg",
    RED_BACKGROUND: "red_bg",
    GREEN_BACKGROUND: "green_bg",
    YELLOW_BACKGROUND: "yellow_bg",
    BLUE_BACKGROUND: "blue_bg",
    PURPLE_BACKGROUND: "purple_bg",
    CYAN_BACKGROUND: "cyan_bg",
    WHITE_BACKGROUND: "white_bg"
};
