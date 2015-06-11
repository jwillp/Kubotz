package com.brm.Kubotz.Common.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;
import com.brm.Kubotz.Common.Hitbox.Hitbox;

/**
 * Triggered when an entity MIGHT be taking Damage
 */
public class TakeDamageEvent extends Event {


    private String damagerId;       // The id of the entity dealing the damage
    private Hitbox targetHitbox;    // The hitbox receiving the damage
    private Hitbox damagerHitbox;   // The hitbox dealing the damage
    private float knockback;          // The knockback to apply
    /**
     * Ctor with no Knockback (defaults to 0);
     * @param entityId the entity being damaged, the target
     * @param targetHitbox the hitbox receiving the damage
     * @param damagerId the entity dealing the damage to the target
     * @param damagerHitbox the hitbox dealing the damage
     */
    public TakeDamageEvent(String entityId, Hitbox targetHitbox, String damagerId, Hitbox damagerHitbox) {
      this(entityId, targetHitbox, damagerId, damagerHitbox, 0);
    }


    public TakeDamageEvent(String entityId, Hitbox targetHitbox, String damagerId, Hitbox damagerHitbox, float knockback){
        super(entityId);
        this.targetHitbox = targetHitbox;
        this.damagerId = damagerId;
        this.damagerHitbox = damagerHitbox;
        this.knockback = knockback;
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

    public float getKnockback() {
        return knockback;
    }
}
