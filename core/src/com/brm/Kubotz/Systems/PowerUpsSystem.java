package com.brm.Kubotz.Systems;

import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.EntityComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Components.Powerups.PowerUp;
import com.brm.Kubotz.Components.Powerups.PowerUpComponent;
import com.brm.Kubotz.Components.Powerups.PowerUpEffect;
import com.brm.Kubotz.Components.Powerups.PowerUpsContainerComponent;
import com.brm.Kubotz.Components.SpawnPointComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Entities.PowerUpFactory;

import java.util.ArrayList;

/**
 * Processes the PowerUps of all the entities
 * It is also responsible of spawning Bonus Objects
 * randomly
 */
public class PowerUpsSystem extends EntitySystem {

    private Timer spawnTimer; //Timer responsible to determine whether or not we should spawn a new power up

    public PowerUpsSystem(EntityManager em) {
        super(em);
        int delay = MathUtils.random(Constants.MIN_DELAY_BONUS_SPAWN, Constants.MAX_DELAY_BONUS_SPAWN);
        spawnTimer = new Timer(delay);
        spawnTimer.start();
    }


    @Override
    public void init() {}


    @Override
    public void update(float dt){
        updatePowerUps();
        updateSpawns();
    }


    /**
     * Terminates all PowerUps if needed
     */
    private void updatePowerUps(){
        for(Entity entity: em.getEntitiesWithComponent(PowerUpsContainerComponent.ID)){
            PowerUpsContainerComponent container;
            container = (PowerUpsContainerComponent) entity.getComponent(PowerUpsContainerComponent.ID);
            ArrayList<PowerUp> powerUps = container.getPowerUps();
            for (int i = 0; i < powerUps.size(); i++) {
                PowerUp powerUp = powerUps.get(i);
                if (powerUp.getEffectDuration().isDone()) {
                    powerUp.getEffect().onFinish(entity);
                    container.removePowerUp(powerUp);
                }
            }
        }
    }

    /**
     * Checks if a new Bonus needs to be spawn
     * if so spawns one
     */
    private void updateSpawns(){
        if(this.spawnTimer.isDone()){
            this.spawnTimer.setDelay(MathUtils.random(Constants.MIN_DELAY_BONUS_SPAWN, Constants.MAX_DELAY_BONUS_SPAWN));
            if(em.getEntitiesWithComponent(PowerUpComponent.ID).size() < Constants.MAX_NB_BONUS){
                this.spawnPowerUp();
            }
            this.spawnTimer.reset();
        }
    }


    /**
     * Spawns a new PowerUp
     */
    private void spawnPowerUp(){


        //Get PowerUps Spawns
        ArrayList<EntityComponent> spawns = em.getComponents(SpawnPointComponent.ID);
        for (int i = 0, spawnsSize = spawns.size(); i < spawnsSize; i++) {
            if (((SpawnPointComponent) spawns.get(i)).getType() != SpawnPointComponent.Type.PowerUp) {
                spawns.remove(i);
            }
        }

        //Get a Random Spawn Point
        int index = MathUtils.random(spawns.size()-1);
        Entity entity = em.getEntitiesWithComponent(SpawnPointComponent.ID).get(index);
        SpawnPointComponent spawn = (SpawnPointComponent)entity.getComponent(SpawnPointComponent.ID);

        //Randomize position
        Vector2 pos = spawn.getPosition();
        pos.x = MathUtils.random(pos.x-0.1f, pos.x+0.1f);
        pos.y = MathUtils.random(pos.y-0.1f, pos.y+0.1f);

        //TODO RANDOMIZE EFFECT
        PowerUpEffect effect = new PowerUpEffect.LaserGunMkIProvider();


        // Make a random PowerUp
        new PowerUpFactory(em, this.getSystemManager().getSystem(PhysicsSystem.class).getWorld())
            .withEffect(effect)
            .withDuration(Timer.TEN_SECONDS * 3)
            .withLifeTime(Timer.TEN_SECONDS * 2)
            .withPosition(pos)
            .build();
    }


}
