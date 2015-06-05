package com.brm.Kubotz.Systems;


import com.brm.GoatEngine.ECS.Components.HealthComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Components.RespawnComponent;

/**
 * Used to make entities Respawn (More like players Respawn)
 */
public class RespawnSystem extends EntitySystem {
	
	 public RespawnSystem(EntityManager em) {
        super(em);
    }


    @Override
    public void init() {

    }

    @Override
    public void update(float dt){
        for(Entity entity: em.getEntitiesWithComponent(RespawnComponent.ID)){
            RespawnComponent respawn = (RespawnComponent) entity.getComponent(RespawnComponent.ID);
            //STATE MACHINE

            Logger.log(respawn.getState());
            switch (respawn.getState()) {
                case DEAD:
                    processDeadState(entity);
                    break;
                case WAITING:
                    processWaitingState(entity);
                    break;
                case SPAWNING:
                    processSpawning(entity);
                    break;
                case SPAWNED:
                    processSpawnedState(entity);
                    break;
            }
        }
        
    }

    /**
     * Processes an entity when it is in the Dead State
     * @param entity
     */
    private void processDeadState(Entity entity){
        RespawnComponent respawn = (RespawnComponent)entity.getComponent(RespawnComponent.ID);
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);

        respawn.getDelay().reset();

        // HIDE BODY //TODO disable Graphics for entity
        phys.getBody().setActive(false);

        respawn.setState(RespawnComponent.State.WAITING);
    }

    /**
     * Processes an entity when it is in the Spawned State
     * @param entity
     */
    private void processSpawnedState(Entity entity){
        RespawnComponent respawn = (RespawnComponent) entity.getComponent(RespawnComponent.ID);
        HealthComponent health = (HealthComponent) entity.getComponent(HealthComponent.ID);
        if(health.isDead()){
            respawn.setState(RespawnComponent.State.DEAD);
        }
    }

    /**
     * Processes an entity when it is in the spawning state
     * @param entity
     */
    private void processSpawning(Entity entity){
        RespawnComponent respawn = (RespawnComponent) entity.getComponent(RespawnComponent.ID);
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        HealthComponent health = (HealthComponent) entity.getComponent(HealthComponent.ID);
        // TODO REDISPLAY GRAPHICS
        phys.getBody().setActive(true);

        health.setAmount(health.getMaxAmount());


        respawn.setState(RespawnComponent.State.SPAWNED);
    }

    /**
     * Processes an entity when it is in the waiting state (waiting to be respawned)
     * @param entity
     */
    private void processWaitingState(Entity entity){
        RespawnComponent respawn = (RespawnComponent) entity.getComponent(RespawnComponent.ID);
        if(respawn.getDelay().isDone()){
            respawn.setState(RespawnComponent.State.SPAWNING);
        }

    }





}