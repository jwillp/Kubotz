package com.brm.Kubotz.Common.Components;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.core.EntityComponent;

/**
 * Used to make an entity deal damage when it comes in contact with something
 */
public class DamageComponent extends EntityComponent {

    public static final String ID = "DAMAGE_COMPONENT";

    private float damage;

    // The movement occuring when an entity collides with the Damaging entity
    private Vector2 knockBack = new Vector2(0,0);


    public DamageComponent(float nbDamage){
        this.damage = nbDamage;
    }

    public DamageComponent(float nbDamage, Vector2 knockBack){
        this.damage = nbDamage;
        this.knockBack = knockBack;
    }

    public float getDamage() {
        return damage;
    }

    public void setDamage(float damage) {
        this.damage = damage;
    }

    public Vector2 getKnockBack() {
        return knockBack;
    }

    public void setKnockBack(Vector2 knockBack) {
        this.knockBack = knockBack;
    }
}
