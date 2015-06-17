package com.brm.Kubotz.Features.GameRules.Events;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * When a player performs a kill i.e killing another player
 */
public class PlayerKillEvent extends EntityEvent {

    /**
     *
     * @param entityId  The player who killed
     */
    public PlayerKillEvent(String entityId) {
        super(entityId);
    }



}
