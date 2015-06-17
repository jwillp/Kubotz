package com.brm.Kubotz.Features.KubotzCharacter.Events;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * Triggered when the entity puts their foot on the ground
 */
public class FootOnGroundEvent extends EntityEvent {

    /**
     *
     * @param entityId the entity
     */
    public FootOnGroundEvent(String entityId) {
        super(entityId);
    }
}
