package com.brm.Kubotz.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

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
    }
}
