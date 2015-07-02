package com.brm.Kubotz.Features.DashBoots;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * Triggered when an entity is dashing and (changing states whithin taht dash)
 */
public class DashPhaseChangeEvent extends EntityEvent {

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
