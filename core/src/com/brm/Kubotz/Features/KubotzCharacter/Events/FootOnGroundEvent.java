package com.brm.Kubotz.Features.KubotzCharacter.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * Triggered when the entity puts their foot on the ground
 */
public class FootOnGroundEvent extends Event{

    /**
     *
     * @param entityId the entity
     */
    public FootOnGroundEvent(String entityId) {
        super(entityId);
    }
}
