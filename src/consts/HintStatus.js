/**
 *  An enumeration containing the possible hint states.
 */
export const HINT_STATUS = {
    /** The receiving player has not specified any status. */
    HINT_UNSPECIFIED : 0,

    /** The receiving player has specified that the item is unneeded. */
    HINT_NO_PRIORITY : 10,

    /** The receiving player has specified that the item is detrimental. */
    HINT_AVOID : 20,

    /** The receiving player has specified that the item is needed. */
    HINT_PRIORITY : 30,

    /** The location has been collected. Status cannot be changed once found. */
    HINT_FOUND : 40
};
