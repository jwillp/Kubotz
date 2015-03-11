package com.brm.Kubotz.Component;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.EntityComponent;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Enables an entity to use a gun
 */
public class GunComponent extends EntityComponent {

    public final static String ID = "GUN_COMPONENT";

    public int damage = 5; //Number of damage per hit for a bullet

    public Vector2 bulletSpeed = new Vector2(30,0);

    public Timer cooldown = new Timer(500); //The delay between bullets

    public Vector2 knockBack = new Vector2(0.3f, 0.1f);

    public boolean isShooting = false;


    public GunComponent(){
        this.cooldown.start();
    }




}
