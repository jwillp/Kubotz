package com.brm.Kubotz.Features.GameRules.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * Triggered when a pre game countdown ends
 * There are normally 4 of these to make a
 * 3-2-1-Go!
 */
public class CountdownEndEvent extends Event{

    private int timeRemaining;


    public CountdownEndEvent(int timeRemaining) {
        super("");
        this.timeRemaining = timeRemaining;
    }

    public int getTimeRemaining() {
        return timeRemaining;
    }

    public void setTimeRemaining(int timeRemaining) {
        this.timeRemaining = timeRemaining;
    }
}
