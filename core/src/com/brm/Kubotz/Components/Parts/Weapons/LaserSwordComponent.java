package com.brm.Kubotz.Components.Parts.Weapons;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.EntityComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Laser Sword
 */
public class LaserSwordComponent extends EntityComponent {

    public static final String ID = "LASER_SWORD_COMPONENT";

    private int damage = 10; //Number of damage per hit

    private Timer durationTimer = new Timer(200); //The Duration of the hit
    private Timer cooldown = new Timer(100); //The delay between hits

    private PhysicsComponent phys;

    private Vector2 knockBack = new Vector2(0.1f, 0.0f);

    private Entity laserBox;


    public LaserSwordComponent(){
        this.durationTimer.start();
        this.cooldown.start();
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
}