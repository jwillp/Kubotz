package com.brm.Kubotz.Features.PowerUps.Components;

import com.brm.GoatEngine.ECS.core.EntityComponent;

/**
 * Gives a shield to an entity. The Shield will absorb Damage
 * For as long as it has health
 */
public class EnergeticShieldComponent extends EntityComponent {

    public static String ID = "ENERGETIC_SHIELD_COMPONENT";

    private float health = 100;



    
    public float getHealth() {
        return health;
    }

    public void setHealth(float health) {
        this.health = health;
    }

    public void takeDamage(float damage){
        health -= damage;
    }

    /**
     * Returns whether or not the shield is dead
     * @return
     */
    public boolean isDead(){
        return !(this.health > 0);
    }
}

