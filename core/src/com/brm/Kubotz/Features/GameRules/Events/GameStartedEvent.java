package com.brm.Kubotz.Features.GameRules.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * Triggered when a game is officially started
 * and the players can fight themselves
 */
public class GameStartedEvent extends Event {

    public GameStartedEvent() {
        super("");
    }

}
