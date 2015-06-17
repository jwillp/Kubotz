package com.brm.Kubotz.Features.GameRules.Events;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * Triggered when a player wins
 */
public class GameWinEvent extends EntityEvent {

    /**
     *
     * @param winnerId the winner
     */
    public GameWinEvent(String winnerId) {
        super(winnerId);
    }


}
