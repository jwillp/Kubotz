package com.brm.Kubotz.Features.DashBoots.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;
import com.brm.Kubotz.Features.DashBoots.Components.DashComponent;

/**
 * Triggered when an entity is dashing and (changing states whithin taht dash)
 */
public class DashPhaseChangeEvent extends Event{

    private DashComponent.Phase phase;

    public DashPhaseChangeEvent(String entityId, DashComponent.Phase phase) {
        super(entityId);
        this.phase = phase;
    }


    public DashComponent.Phase getPhase() {
        return phase;
    }

    public void setPhase(DashComponent.Phase phase) {
        this.phase = phase;
    }
}
