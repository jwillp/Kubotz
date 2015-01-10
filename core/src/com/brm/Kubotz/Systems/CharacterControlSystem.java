package com.brm.Kubotz.Systems;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.Kubotz.Input.GameAction;
import com.brm.Kubotz.Component.ControllableComponent;
import com.brm.GoatEngine.ECS.Components.JumpComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;

import java.util.ArrayList;

/**
 * System handling the controllable Entities such as most characters
 */
public class CharacterControlSystem extends com.brm.GoatEngine.ECS.System.System {


    public CharacterControlSystem(EntityManager em) {
        super(em);
    }

    public void update(ArrayList<GameAction> gameActions){

        // For each controllable entity --> process every possible action
        for(Entity e : this.em.getEntitiesWithComponent(ControllableComponent.ID)){
            for(GameAction gameAction : gameActions){
                processAction(e, gameAction);
            }
            if(gameActions.isEmpty()){
                decelerate((PhysicsComponent)e.getComponent(PhysicsComponent.ID));
            }
        }
    }

    /**
     * Process a game action for an entity
     * @param entity
     * @param action
     */
    private void processAction(Entity entity, GameAction action){

        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        String actionType = (String) action.getData("TYPE");

        if(actionType.equals(GameAction.MOVE_LEFT)) {
            moveLeft(phys);
        }else if(actionType.equals(GameAction.MOVE_RIGHT)){
            moveRight(phys);
        }else if(actionType.equals(GameAction.MOVE_JUMP)){
            jump(entity);
        }else if(actionType.equals(GameAction.MOVE_DOWN)){
            moveDown(phys);
        }else{
            decelerate(phys);
        }
    }

    /***
     * Makes the entity move left
     */
    private void moveLeft(PhysicsComponent mp){
        Vector2 vel = mp.getBody().getLinearVelocity();

        float resultingVelocity = vel.x - mp.getAcceleration().x;

        if(Math.abs(resultingVelocity) > mp.MAX_SPEED.x){
            resultingVelocity = -mp.MAX_SPEED.x;
        }

        mp.getBody().setLinearVelocity(resultingVelocity, vel.y);
    }

    /**
     * Makes the entity move right
     */
    private void moveRight(PhysicsComponent mp){
        Vector2 vel = mp.getBody().getLinearVelocity();

        float resultingVelocity = vel.x + mp.getAcceleration().x;
        if(resultingVelocity > mp.MAX_SPEED.x){
            resultingVelocity = mp.MAX_SPEED.x;
        }

        mp.getBody().setLinearVelocity(resultingVelocity, vel.y);
    }

    /**dd
     * Makes the entity jump
     */
    private void jump(Entity entity){

        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        JumpComponent jp;

        if(entity.hasComponent(JumpComponent.ID)){
            jp = (JumpComponent) entity.getComponent(JumpComponent.ID);

            if(phys.isGrounded() || jp.nbJujmps < jp.getNbJumpsMax()){
                if(phys.isGrounded()){ //Reset jump number
                    jp.nbJujmps = 0;
                }
                Vector2 vel = phys.getBody().getLinearVelocity();
                float resultingVelocity = -phys.getBody().getWorld().getGravity().y*0.6f;
                phys.getBody().setLinearVelocity(vel.x, resultingVelocity*phys.getBody().getGravityScale());
                phys.setGrounded(false);
                jp.nbJujmps++;
            }
        }
    }

    /**
     * Makes the entity fall faster when not on ground
     */
    private void moveDown(PhysicsComponent mp){
        Vector2 vel = mp.getBody().getLinearVelocity();

        float resultingVelocity = vel.y - mp.getAcceleration().y;
        if(Math.abs(resultingVelocity) > mp.MAX_SPEED.y){
            resultingVelocity = -mp.MAX_SPEED.y;
        }
        mp.getBody().setLinearVelocity(vel.x, resultingVelocity*mp.getBody().getGravityScale()); // it's half a jump
    }

    /**
     * Gradually stops the entity by applying deceleration
     * to its velocity
     */
    private void decelerate(PhysicsComponent mp){
        if(mp.isGrounded()){
            Vector2 vel = mp.getBody().getLinearVelocity();
            // DECELERATION (the character needs to slow down!)
            if (vel.x != 0) {
                if (vel.x > 0) {
                    mp.getBody().setLinearVelocity(vel.x - mp.getAcceleration().x, vel.y);
                } else {
                    mp.getBody().setLinearVelocity(vel.x + mp.getAcceleration().x, vel.y);
                }
                if(Math.abs(vel.x) < 0.1){ // so it can go to 0 (otherwise we could move for ever)
                    mp.getBody().setLinearVelocity(0, vel.y);
                }
            }
        }
    }

    /**
     * Abruptly stops the controllable entity in X
     */
    private void stopX(PhysicsComponent mp){
        Vector2 vel = mp.getBody().getLinearVelocity();
        mp.getBody().setLinearVelocity(0, vel.y);
    }

    /**
     * Abruptly stops the controllable entity in Y
     */
    private void stopY(PhysicsComponent mp){
        Vector2 vel = mp.getBody().getLinearVelocity();
        mp.getBody().setLinearVelocity(vel.x, 0);
    }




}
