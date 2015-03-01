package com.brm.Kubotz.Component;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.Component;

/**
 * Used to make an entity deal damage when colliding with something
 */
public class DamageComponent extends Component {

    public static final String ID = "DAMAGE_COMPONENT";

    public float damage;
    public Vector2 knockBack = new Vector2(0,0);


    public DamageComponent(float nbDamage){
        this.damage = nbDamage;
    }

    public DamageComponent(float nbDamage, Vector2 knockBack){
        this.damage = nbDamage;
        this.knockBack = knockBack;
    }





}
