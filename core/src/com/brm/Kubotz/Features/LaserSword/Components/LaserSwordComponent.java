package com.brm.Kubotz.Features.LaserSword.Components;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.core.Components.EntityComponent;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Config;

/**
 * Laser Sword
 */
public class LaserSwordComponent extends EntityComponent {

    public static final String ID = "LASER_SWORD_COMPONENT";

    private int damage = Config.LASER_SWORD_DAMAGE; //Number of damage per hit

    private Timer durationTimer = new Timer(800); //The Duration of the hit
    private Timer cooldown = new Timer(Config.LASER_SWORD_COOLDOWN); //The delay between hits

    private PhysicsComponent phys;

    private Vector2 knockBack = new Vector2(0.2f, 0.0f);

    private Entity laserBox;
    private boolean swinging = false;


    public LaserSwordComponent(){
        this.cooldown.start();
        this.durationTimer.start();
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

    public void setCooldown(Timer cooldown) {
        this.cooldown = cooldown;
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

    public void setKnockBack(Vector2 knockBack) {
        this.knockBack = knockBack;
    }

    public Entity getLaserBox() {
        return laserBox;
    }

    public void setLaserBox(Entity laserBox) {
        this.laserBox = laserBox;
    }

    public boolean isSwinging() {
        return swinging;
    }

    public void setSwinging(boolean swinging) {
        this.swinging = swinging;
    }
}
