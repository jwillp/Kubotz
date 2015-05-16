package com.brm.Kubotz.Systems.MovementSystems;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.ECS.Components.JumpComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityContact;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.Movements.RunningComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Input.GameButton;

/**
 * On Ground Movement System: Running + Jumping
 */
public class RunningSystem extends EntitySystem {


    public RunningSystem(EntityManager em) {
        super(em);
    }



    @Override
    public void handleInput(){
        for(Entity entity: em.getEntitiesWithComponentEnabled(RunningComponent.ID)){
            if(entity.hasComponent(VirtualGamePad.ID)){
                handleInputForEntity(entity);
            }
        }
    }





    /**
     * Process a Movement Button for the entities
     */
    private void handleInputForEntity(Entity entity){
        VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
        if (!gamePad.isAnyButtonPressed()) {
            decelerate(entity);
        } else {
            if (gamePad.isButtonPressed(GameButton.MOVE_UP)) {
                jump(entity);
            } else if (gamePad.isButtonPressed(GameButton.MOVE_DOWN)) {
                moveDown(entity); // TODO test if crouch or fall down
            } else if (gamePad.isButtonPressed(GameButton.MOVE_RIGHT)) {
                moveRight(entity);
            } else if (gamePad.isButtonPressed(GameButton.MOVE_LEFT)) {
                moveLeft(entity);
            } else {
                //No movement made we decelerate
                decelerate(entity); //TODO Is this really needed? see a few lines above
            }
        }
    }


    @Override
    public void update(float dt) {
        updateIsGrounded();
    }




    /**
     * Updates the property describing if an entity is grounded or not
     */
    private void updateIsGrounded(){
        // TODO only do it for Running Entities
        for(Component comp: em.getComponents(PhysicsComponent.ID)){
            PhysicsComponent phys = (PhysicsComponent) comp;
            for(int i=0; i<phys.contacts.size(); i++){
                EntityContact contact = phys.contacts.get(i);
                if(contact.fixtureA.getUserData() == Constants.FIXTURE_FEET_SENSOR){
                    phys.setGrounded(contact.describer == EntityContact.Describer.BEGIN);
                    phys.contacts.remove(i);

                    //REMOVE OTHER contact for other entity
                    PhysicsComponent physB = (PhysicsComponent) contact.getEntityB().getComponent(PhysicsComponent.ID);
                    physB.contacts.remove(contact);
                }
            }
        }
    }




    /***
     * Makes the entity move left (whether it is during flying or walking or dashing)
     */
    private void moveLeft(Entity entity){
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);

        Vector2 vel = phys.getVelocity();
        float resultingVelocity = vel.x - phys.getAcceleration().x;

        if(Math.abs(resultingVelocity) > phys.MAX_SPEED.x){
            resultingVelocity = -phys.MAX_SPEED.x;
        }

        MovementSystem.moveInX(entity, resultingVelocity);
    }

    /**
     * Makes the entity move right (whether it is during flying or walking or dashing)
     */
    private void moveRight(Entity entity){
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        Vector2 vel = phys.getVelocity();
        float resultingVelocity = vel.x + phys.getAcceleration().x;
        if(resultingVelocity > phys.MAX_SPEED.x){
            resultingVelocity = phys.MAX_SPEED.x;
        }
        MovementSystem.moveInX(entity, resultingVelocity);
    }


    /**
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
                float resultingVelocity = phys.getAcceleration().y * phys.getBody().getGravityScale();
                MovementSystem.moveInY(entity, resultingVelocity);
                phys.setGrounded(false);
                jp.nbJujmps++;
            }
        }
    }

    /**
     * Makes the entity fall faster when not on ground
     */ // TODO Tweak to make it better ==> at higher speed it slows you down instead of making you faster
    private void moveDown(Entity entity){
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        Vector2 vel = phys.getVelocity().cpy();


        if(Math.abs(vel.y) > phys.MAX_SPEED.y){
            vel.y = -phys.MAX_SPEED.y;
        }
        float resultingVelocity = vel.y -  phys.getAcceleration().y*0.2f * phys.getBody().getGravityScale();
        resultingVelocity = Math.min(resultingVelocity, phys.getVelocity().y);
        // it's half a jump
        MovementSystem.moveInY(entity, resultingVelocity);
    }

    /**
     * Gradually stops the entity by applying deceleration
     * to its velocity
     * @param entity the entity to stop
     */
    private void decelerate(Entity entity){
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        if(phys.isGrounded()){
            Vector2 vel = phys.getVelocity();
            // DECELERATION (the character needs to slow down!)
            float finalVel = (vel.x > 0) ?
                    Math.max(vel.x - phys.getAcceleration().x, 0) : Math.min(vel.x + phys.getAcceleration().x, 0);
            MovementSystem.moveInX(entity, finalVel);
        }
    }
}
