package com.brm.Kubotz.Systems;

import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.Kubotz.Component.Powerups.PowerUp;
import com.brm.Kubotz.Component.Powerups.PowerUpsContainerComponent;

/**
 * Processes the PowerUps of all the entities
 */
public class PowerUpsSystem extends EntitySystem {

    public PowerUpsSystem(EntityManager em) {
        super(em);
    }


    /**
     * Terminates all PowerUps if needed
     */
    public void update(){
        for(Entity entity: em.getEntitiesWithComponent(PowerUpsContainerComponent.ID)){
            PowerUpsContainerComponent container;
            container = (PowerUpsContainerComponent) entity.getComponent(PowerUpsContainerComponent.ID);
            for(PowerUp powerUp: container.getPowerUps()){
                if(powerUp.effectTimer.isDone()){
                    powerUp.effect.onFinish(entity);
                    container.removePowerUp(powerUp);
                }
            }
        }
    }


}
