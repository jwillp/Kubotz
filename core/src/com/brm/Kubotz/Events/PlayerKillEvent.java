package com.brm.Kubotz.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * When a player performs a kill i.e killing another player
 */
public class PlayerKillEvent extends Event{

    /**
     *
     * @param entityId  The player who killed
     */
    public PlayerKillEvent(String entityId) {
        super(entityId);
    }



}
