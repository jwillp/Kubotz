package com.brm.Kubotz.Features.GameRules.Events;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * Triggered when a game is officially started
 * and the players can fight themselves
 */
public class GameStartedEvent extends EntityEvent {

    public GameStartedEvent() {
        super("");
    }

}
