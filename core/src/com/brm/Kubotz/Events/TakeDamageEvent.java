package com.brm.Kubotz.Events;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * Triggered when an entity is taking Damage
 */
public class TakeDamageEvent extends Event {

    private final float damage;
    private final Vector2 knockback;


    /**
     * Ctor with no Knockback
     * @param entityId the entity being damaged, the target
     * @param damagerId the entity inflicting the damage to the target
     * @param damage the amount of damage to inflict
     */
    public TakeDamageEvent(String entityId, String damagerId, float damage) {
        this(entityId, damagerId, damage, new Vector2(0,0));
    }

    /**
     * Ctor
     * @param entityId the entity being damaged, the target
     * @param damagerId the entity inflicting the damage to the target
     * @param damage the amount of damage to inflict
     * @param knockback the knockback associated
     */
    public TakeDamageEvent(String entityId, String damagerId, float damage, Vector2 knockback){
        super(entityId);
        this.damage = damage;
        this.knockback = knockback;
    }

    public float getDamage() {
        return damage;
    }

    public Vector2 getKnockback() {
        return knockback;
    }
}
