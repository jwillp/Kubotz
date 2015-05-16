package com.brm.Kubotz.Component.Parts.Weapons;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Enables an entity to use a gun
 */
public class GunComponent extends Component {

    public static final String ID = "GUN_COMPONENT";

    // TYPES OF GUN
    public enum Type{

        LASER_MK_I,
        LASER_MK_II,

    }


    protected int damage = 5; //Number of damage per hit for a bullet

    protected Vector2 bulletSpeed = new Vector2(30,0);

    protected Timer cooldown = new Timer(500); //The delay between bullets

    protected Vector2 knockBack = new Vector2(0.3f, 0.1f);

    protected boolean isShooting = false;


    public GunComponent(Type type){

        switch (type) {
            case LASER_MK_I:
                init(5, new Vector2(30, 0), 500, new Vector2(0.1f, 0.1f));
                break;
            case LASER_MK_II:
                init(9, new Vector2(40, 0), 600, new Vector2(0.3f, 0.0f));
                break;
        }

    }

    /**
     * Initialises the gun with certain values
     * @param damage
     * @param bulletSpeed
     * @param cooldownDelay
     * @param kockBack
     */
    private void init(int damage, Vector2 bulletSpeed, int cooldownDelay, Vector2 kockBack){
        this.cooldown.setDelay(cooldownDelay);
        this.cooldown.start();
        this.setDamage(damage);
        this.setBulletSpeed(bulletSpeed);
        this.setKnockBack(knockBack);
    }



    public static String getId() {
        return ID;
    }

    public int getDamage() {
        return damage;
    }

    public void setDamage(int damage) {
        this.damage = damage;
    }

    public Vector2 getBulletSpeed() {
        return bulletSpeed;
    }

    public void setBulletSpeed(Vector2 bulletSpeed) {
        this.bulletSpeed = bulletSpeed;
    }

    public Timer getCooldown() {
        return cooldown;
    }


    public Vector2 getKnockBack() {
        return knockBack;
    }

    public void setKnockBack(Vector2 knockBack) {
        this.knockBack = knockBack;
    }

    public boolean isShooting() {
        return isShooting;
    }

    public void setShooting(boolean isShooting) {
        this.isShooting = isShooting;
    }


}