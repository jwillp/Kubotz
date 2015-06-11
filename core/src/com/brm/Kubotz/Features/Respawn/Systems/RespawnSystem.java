package com.brm.Kubotz.Features.Respawn.Systems;


import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.utils.Components.CameraTargetComponent;
import com.brm.GoatEngine.ECS.core.Components.EntityComponent;
import com.brm.GoatEngine.ECS.utils.Components.HealthComponent;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Components.Graphics.SpriterAnimationComponent;
import com.brm.Kubotz.Features.Respawn.Components.RespawnComponent;
import com.brm.Kubotz.Features.Respawn.Components.SpawnPointComponent;

import java.util.ArrayList;

/**
 * Used to make entities Respawn (More like players Respawn)
 */
public class RespawnSystem extends EntitySystem {
	
	public RespawnSystem(){}


    @Override
    public void init() {

    }

    @Override
    public void update(float dt){
        for(Entity entity: getEntityManager().getEntitiesWithComponent(RespawnComponent.ID)){
            RespawnComponent respawn = (RespawnComponent) entity.getComponent(RespawnComponent.ID);
            //STATE MACHINE

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

        entity.disableComponent(SpriterAnimationComponent.ID);
        entity.disableComponent(VirtualGamePad.ID);

        entity.disableComponent(CameraTargetComponent.ID);

        // TODO DO NOT RESPAWN IF NOT ENOUGH LIVES IN PLAYER INFO

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


        Vector2 point = getRandomSpawnPoint();
        phys.setPosition(point.x, point.y);
        phys.getBody().setActive(true);


        entity.enableComponent(SpriterAnimationComponent.ID);
        entity.enableComponent(CameraTargetComponent.ID);

        entity.enableComponent(VirtualGamePad.ID);



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

    /**
     * Returns a random Spawn point
     * @return
     */
    private Vector2 getRandomSpawnPoint(){

        //Get PowerUps Spawns
        ArrayList<EntityComponent> spawns = getEntityManager().getComponents(SpawnPointComponent.ID);
        for (int i = 0; i < spawns.size(); i++) {
            if (((SpawnPointComponent) spawns.get(i)).getType() != SpawnPointComponent.Type.Player) {
                spawns.remove(i);
            }
        }

        //Get a Random Spawn Point
        int index = MathUtils.random(spawns.size() - 1);
        Entity entity = getEntityManager().getEntitiesWithComponent(SpawnPointComponent.ID).get(index);
        SpawnPointComponent spawn = (SpawnPointComponent)entity.getComponent(SpawnPointComponent.ID);

        //Randomize position
        Vector2 pos = spawn.getPosition();
        pos.x = MathUtils.random(pos.x-0.1f, pos.x+0.1f);
        pos.y = MathUtils.random(pos.y-0.1f, pos.y+0.1f);

        Logger.log(pos);

        return pos;
    }



}