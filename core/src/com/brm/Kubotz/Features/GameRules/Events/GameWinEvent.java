package com.brm.Kubotz.Features.GameRules.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * Triggered when a player wins
 */
public class GameWinEvent extends Event{

    /**
     *
     * @param winnerId the winner
     */
    public GameWinEvent(String winnerId) {
        super(winnerId);
    }


}
