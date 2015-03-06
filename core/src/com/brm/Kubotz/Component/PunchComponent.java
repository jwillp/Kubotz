package com.brm.Kubotz.Component;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Component used to let an entity punch
 */
public class PunchComponent extends Component {

    public static final String ID = "PUNCH_COMPONENT";

    public int damage = 3; //Number of damage per hit

    public Timer durationTimer = new Timer(2000); //The Duration of the hit
    public Timer cooldown = new Timer(80); //The delay between hits
    PhysicsComponent phys;

    public Vector2 knockBack = new Vector2(0.2f, 0.2f);

    public Entity punchBullet;

    /**
     *
     * @param phys : The physics component of the entity
     */
    public PunchComponent(PhysicsComponent phys){
       this.phys = phys;
        this.durationTimer.start();
        this.cooldown.start();
    }



    @Override
    public void onDetach() {
        //DELETE BULLET?
        PhysicsComponent phys = (PhysicsComponent) punchBullet.getComponent(PhysicsComponent.ID);
        phys.getBody().getWorld().destroyBody(phys.getBody());
    }
}
