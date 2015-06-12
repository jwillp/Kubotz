package com.brm.Kubotz.Features.GameRules.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;
import com.brm.GoatEngine.Utils.Logger;

/**
 * Triggered when a player is Defeated
 */
public class PlayerEliminatedEvent extends Event {

    /**
     *
     * @param entityId The player defeated
     */
    public PlayerEliminatedEvent(String entityId) {
        super(entityId);
        Logger.log("Player Elliminated");
    }




}
