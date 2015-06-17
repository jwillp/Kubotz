package com.brm.Kubotz.Features.GameRules.Events;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * Triggered when a player dies
 */
public class PlayerDeadEvent extends EntityEvent {

    /**
     * @param entityId The player killed
     */
    public PlayerDeadEvent(String entityId) {
        super(entityId);
    }



}
