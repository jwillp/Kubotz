package com.brm.Kubotz.Systems;

import com.badlogic.gdx.math.MathUtils;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Component.Powerups.PowerUp;
import com.brm.Kubotz.Component.Powerups.PowerUpComponent;
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
    }


    private Timer spawnTimer; //Timer responsible to determine whether or not we should spawn a new power up


    @Override
    public void init() {
        super.init();
        int delay = MathUtils.random(Constants.MIN_DELAY_BONUS_SPAWN, Constants.MAX_DELAY_BONUS_SPAWN);
        spawnTimer = new Timer(delay);
        spawnTimer.start();
    }

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
        }
    }


    /**
     * Spawns a new PowerUp
     */
    private void spawnPowerUp(){
       //TODO Make a Random Bonus
        for(Entity entity: em.getEntitiesWithComponent(SpawnPointComponent.ID)){
            SpawnPointComponent spawn = (SpawnPointComponent)entity.getComponent(SpawnPointComponent.ID);

            // Make a random PowerUp
            //PowerUpFactory factory = new PowerUpFactory(em,);




        }


    }


}
