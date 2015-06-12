package com.brm.Kubotz.Common.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;
import com.brm.GoatEngine.Utils.Logger;

/**
 * Triggered when an entity has taken damage (not to be confused with TakeDamageEvent
 */
public class DamageTakenEvent extends Event{

    private String attackerId;

    /**
     * The entity who took the damage
     * @param entityId the entity taking the damage
     * @param attackerId the entity dealing the damage
     */
    public DamageTakenEvent(String entityId, String attackerId) {
        super(entityId);
        this.attackerId = attackerId;
    }

    public String getAttackerId() {
        return attackerId;
    }
}
