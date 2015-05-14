package com.brm.Kubotz.Component.Powerups;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Systems.LaserSwordSystem;

/**
 * Laser Sword
 */
public class LaserSwordComponent extends Component {

    public static final String ID = "LASER_SWORD_COMPONENT";

    public int damage = 10; //Number of damage per hit

    public Timer durationTimer = new Timer(200); //The Duration of the hit
    public Timer cooldown = new Timer(100); //The delay between hits

    PhysicsComponent phys;

    public Vector2 knockBack = new Vector2(0.1f, 0.0f);

    public Entity laserBox;


    public LaserSwordComponent(){
        this.durationTimer.start();
        this.cooldown.start();
    }



}
