package com.brm.Kubotz.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * Triggered when a player dies
 */
public class PlayerDeadEvent extends Event {

    /**
     * @param entityId The player killed
     */
    public PlayerDeadEvent(String entityId) {
        super(entityId);
    }



}
