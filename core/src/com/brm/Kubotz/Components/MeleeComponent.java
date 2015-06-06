package com.brm.Kubotz.Components;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.core.Components.EntityComponent;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Config;
import com.brm.Kubotz.Constants;

/**
 * Component used to let an entity punch
 */
public class MeleeComponent extends EntityComponent {

    public static final String ID = "PUNCH_COMPONENT";

    private int damage = Config.PUNCH_DAMAGE; //Number of damage per hit

    private Timer inputDelay = new Timer(Constants.PUNCH_INPUT_DELAY);
    private Timer durationTimer = new Timer(Constants.PUNCH_DURATION); //The Duration of the hit
    private Timer cooldown = new Timer(Config.PUNCH_COOLDOWN); //The delay between hits
    private PhysicsComponent phys;

    private Vector2 knockBack = new Vector2(0.1f, 0.1f);

    private Entity punchBullet;

    /**
     *
     * @param phys : The physics component of the entity
     */
    public MeleeComponent(PhysicsComponent phys){
       this.phys = phys;
        this.durationTimer.start();
        this.cooldown.start();
    }



    @Override
    public void onDetach(Entity entity) {
        //DELETE BULLET?
        PhysicsComponent phys = (PhysicsComponent) punchBullet.getComponent(PhysicsComponent.ID);
        phys.getBody().getWorld().destroyBody(phys.getBody());
    }

    public int getDamage() {
        return damage;
    }

    public void setDamage(int damage) {
        this.damage = damage;
    }

    public Timer getDurationTimer() {
        return durationTimer;
    }

    public void setDurationTimer(Timer durationTimer) {
        this.durationTimer = durationTimer;
    }

    public Timer getCooldown() {
        return cooldown;
    }

    public PhysicsComponent getPhys() {
        return phys;
    }

    public void setPhys(PhysicsComponent phys) {
        this.phys = phys;
    }

    public Vector2 getKnockBack() {
        return knockBack;
    }

    public Entity getPunchBullet() {
        return punchBullet;
    }

    public void setPunchBullet(Entity punchBullet) {
        this.punchBullet = punchBullet;
    }
}
