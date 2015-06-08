package com.brm.Kubotz.Events;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.core.Entity.Event;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Hitbox.Hitbox;

/**
 * Triggered when an entity is taking Damage
 */
public class TakeDamageEvent extends Event {

    private final String entityId;
    private String damagerId;       // The id of the entity dealing the damage
    private Hitbox targetHitbox;    // The hitbox receiving the damage
    private Hitbox damagerHitbox;   // The hitbox dealing the damage

    /**
     * Ctor with no Knockback
     * @param entityId the entity being damaged, the target
     * @param targetHitbox the hitbox receiving the damage
     * @param damagerId the entity dealing the damage to the target
     * @param damagerHitbox the hitbox dealing the damage
     */
    public TakeDamageEvent(String entityId, Hitbox targetHitbox, String damagerId, Hitbox damagerHitbox) {
        super(entityId);
        this.entityId = entityId;
        this.targetHitbox = targetHitbox;
        this.damagerId = damagerId;
        this.damagerHitbox = damagerHitbox;
        Logger.log("TAKE DAMAGE");
    }


    public Hitbox getDamagerHitbox() {
        return damagerHitbox;
    }

    public void setDamagerHitbox(Hitbox damagerHitbox) {
        this.damagerHitbox = damagerHitbox;
    }

    public Hitbox getTargetHitbox() {
        return targetHitbox;
    }

    public String getDamagerId() {
        return damagerId;
    }
}
