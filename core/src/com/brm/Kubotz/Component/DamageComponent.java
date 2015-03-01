package com.brm.Kubotz.Component;

/**
 * Used to make an entity deal damage when it comes in contact with something
 */
public class DamageComponent {

    public static final String ID = "DAMAGE_COMPONENT";

    public float damage;


    public DamageComponent(float nbDamage){
        this.damage = nbDamage;
    }

}
