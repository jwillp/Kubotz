package com.brm.Kubotz.Systems;

import com.badlogic.gdx.math.MathUtils;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Utils.GameMath;
import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Component.Powerups.PowerUp;
import com.brm.Kubotz.Component.Powerups.PowerUpComponent;
import com.brm.Kubotz.Component.Powerups.PowerUpEffect;
import com.brm.Kubotz.Component.Powerups.PowerUpsContainerComponent;
import com.brm.Kubotz.Component.SpawnPointComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Entities.PowerUpFactory;

/**
 * Processes the PowerUps of all the entities
 * It is also responsible of spawning Bonus Objects
 * randomly
 */
public class PowerUpsSystem extends EntitySystem {

    public PowerUpsSystem(EntityManager em) {
        super(em);
        super.init();
        int delay = MathUtils.random(Constants.MIN_DELAY_BONUS_SPAWN, Constants.MAX_DELAY_BONUS_SPAWN);
        spawnTimer = new Timer(delay);
        spawnTimer.start();
    }


    private Timer spawnTimer; //Timer responsible to determine whether or not we should spawn a new power up



    public void update(){
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
            for(PowerUp powerUp: container.getPowerUps()){
                if(powerUp.effectDuration.isDone()){
                    powerUp.effect.onFinish(entity);
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
       //TODO Make a Random Bonus

        //Get a Random Spawn Point
        int index = MathUtils.random(em.getEntitiesWithComponent(SpawnPointComponent.ID).size()-1);
        Entity entity = em.getEntitiesWithComponent(SpawnPointComponent.ID).get(index);
        SpawnPointComponent spawn = (SpawnPointComponent)entity.getComponent(SpawnPointComponent.ID);


        // Make a random PowerUp
        PowerUpFactory factory;
        new PowerUpFactory(em, this.getSystemManager().getSystem(PhysicsSystem.class).getWorld())
            .withEffect(new PowerUpEffect.JumpModifier())
            .withDuration(Timer.TEN_SECONDS)
            .withLifeTime(Timer.TEN_SECONDS * 2)
            .withPosition(spawn.getPosition())
            .build();


    }


}
