package com.brm.Kubotz.Systems;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.Kubotz.GameAction;
import com.brm.Kubotz.Properties.ControllableProperty;
import com.brm.Kubotz.Properties.JumpProperty;
import com.brm.Kubotz.Properties.PhysicsProperty;

import java.util.ArrayList;

/**
 * System handling the controllable Entities such as mst characters
 */
public class CharacterControlSystem extends com.brm.GoatEngine.ECS.System.System {


    public CharacterControlSystem(EntityManager em) {
        super(em);
    }

    public void update(ArrayList<GameAction> gameActions){

        // For each controllable entity --> process every possible action
        for(Entity e : this.em.getEntitiesWithProperty(ControllableProperty.ID)){
            for(GameAction gameAction : gameActions){
                processAction(e, gameAction);
            }
            if(gameActions.isEmpty()){
                decelerate((PhysicsProperty)e.getProperty(PhysicsProperty.ID));
            }


        }

    }

    /**
     * Process a game action for an entity
     * @param entity
     * @param action
     */
    private void processAction(Entity entity, GameAction action){
        PhysicsProperty phys = (PhysicsProperty) entity.getProperty(PhysicsProperty.ID);
        String actionType = (String) action.getData("TYPE");

        Logger.log(actionType);

        if(actionType.equals(GameAction.MOVE_LEFT)) {
            moveLeft(phys);
        }else if(actionType.equals(GameAction.MOVE_RIGHT)){
            moveRight(phys);
        }else if(actionType.equals(GameAction.MOVE_JUMP)){
            jump(entity);
        }else if(actionType.equals(GameAction.MOVE_DOWN)){
            moveDown(phys);
        }else{
            Logger.log("DECEL");
            decelerate(phys);
        }

    }





    /***
     * Makes the entity move left
     */
    private void moveLeft(PhysicsProperty mp){
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
    private void moveRight(PhysicsProperty mp){
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
        PhysicsProperty mp = (PhysicsProperty) entity.getProperty(PhysicsProperty.ID);
        JumpProperty jp;
        if(entity.hasProperty(JumpProperty.ID)){
            jp = (JumpProperty)entity.getProperty(JumpProperty.ID);
            if(mp.isGrounded() || jp.nbJujmps < jp.getNbJumpsMax()){
                if(mp.isGrounded()){ //Reset jump number
                    jp.nbJujmps = 0;
                }

                Vector2 vel = mp.getBody().getLinearVelocity();
                float resultingVelocity = -mp.getBody().getWorld().getGravity().y*0.6f;
                mp.getBody().setLinearVelocity(vel.x, resultingVelocity*mp.getBody().getGravityScale());

                mp.setGrounded(false);
                jp.nbJujmps++;

            }
        }
    }

    /**
     * Makes the entity fall faster when not on ground
     */
    private void moveDown(PhysicsProperty mp){
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
    private void decelerate(PhysicsProperty mp){
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
    private void stopX(PhysicsProperty mp){
        Vector2 vel = mp.getBody().getLinearVelocity();
        mp.getBody().setLinearVelocity(0, vel.y);
    }

    /**
     * Abruptly stops the controllable entity in Y
     */
    private void stopY(PhysicsProperty mp){
        Vector2 vel = mp.getBody().getLinearVelocity();
        mp.getBody().setLinearVelocity(vel.x, 0);
    }















}
