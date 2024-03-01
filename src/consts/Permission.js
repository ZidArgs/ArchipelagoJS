/**
 * A const containing the possible command permissions, for commands that may be restricted.
 */
export const PERMISSION = {
    /** Prevents players from using this command at any time. */
    DISABLED: 0,

    /** Allows players to use this command manually at any time. */
    ENABLED: 0b001,

    /** Allows players to use this command manually after they have completed their goal. */
    GOAL: 0b010,

    /**
     * Forces players to use this command after they have completed their goal. Only works for `!release` and `!collect`
     */
    AUTO: 0b110,

    /**
     * Allows players to use this command manually at any time and forces them to use this command after they have
     * completed their goal.
     */
    AUTO_ENABLED: 0b111
};

/**
 * A const containing the possible command permissions, for commands that may be restricted and do not support auto
 * modes.
 */
export const REDUCED_PERMISSION = {
    /** Prevents players from using this command at any time. */
    DISABLED: 0,

    /** Allows players to use this command manually at any time. */
    ENABLED: 0b001,

    /** Allows players to use this command manually after they have completed their goal. */
    GOAL: 0b010
};
