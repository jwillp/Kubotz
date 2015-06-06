package com.brm.Kubotz.Systems.MovementSystems;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.JumpComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Event;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Components.Movements.RunningComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Events.CollisionEvent;
import com.brm.Kubotz.Input.GameButton;

/**
 * On Ground Movement System: Running + Jumping
 */
public class RunningSystem extends EntitySystem {


    public RunningSystem(){}

    @Override
    public void init() {
    }


    @Override
    public void handleInput() {
        for (Entity entity : getEntityManager().getEntitiesWithComponentEnabled(RunningComponent.ID)) {
            if (entity.hasComponent(VirtualGamePad.ID)) {
                handleInputForEntity(entity);
            }
        }
    }


    /**
     * Process a Movement Button for the entities
     */
    private void handleInputForEntity(Entity entity) {
        VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
        if (!gamePad.isAnyButtonPressed()) {
            decelerate(entity);
        } else {
            if (gamePad.isButtonPressed(GameButton.MOVE_UP)) {
                jump(entity);
            } else if (gamePad.isButtonPressed(GameButton.MOVE_DOWN)) {
                moveDown(entity);

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
        updateJumps();
    }

    /**
     * If an entity is Grounded resets the number of jumps to 0
     */
    private void updateJumps() {

        //RESET JUMPS
        for (Entity entity : getEntityManager().getEntitiesWithComponent(JumpComponent.ID)) {
            PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
            JumpComponent jp = (JumpComponent) entity.getComponent(JumpComponent.ID);
            if (phys.isGrounded()) {
                jp.setNbJujmps(0);
            }
        }

    }


    @Override
    public <T extends Event> void onEvent(T event) {
        if(event.getClass() == CollisionEvent.class){
           this.onCollision((CollisionEvent)event);
        }
    }


    /**
     * Called when a collision occurs between two entities
     * @param contact
     */
    private void onCollision(CollisionEvent contact){
        if(contact.getFixtureA().getUserData().equals(Constants.FIXTURE_FEET_SENSOR)) {
            if (contact.getEntityA().hasComponentEnabled(RunningComponent.ID)) {
                PhysicsComponent phys = (PhysicsComponent) contact.getEntityA().getComponent(PhysicsComponent.ID);
                phys.setGrounded(contact.getDescriber() == CollisionEvent.Describer.BEGIN);
            }
        }
    }





    /**
     * Makes the entity move left (whether it is during flying or walking or dashing)
     */
    private void moveLeft(Entity entity) {
        PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);

        Vector2 vel = phys.getVelocity();
        float resultingVelocity = vel.x - phys.getAcceleration().x;

        if (Math.abs(resultingVelocity) > phys.getMaxSpeed().x) {
            resultingVelocity = -phys.getMaxSpeed().x;
        }

        MovementSystem.moveInX(entity, resultingVelocity);
    }

    /**
     * Makes the entity move right (whether it is during flying or walking or dashing)
     */
    private void moveRight(Entity entity) {
        PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
        Vector2 vel = phys.getVelocity();
        float resultingVelocity = vel.x + phys.getAcceleration().x;
        if (resultingVelocity > phys.getMaxSpeed().x) {
            resultingVelocity = phys.getMaxSpeed().x;
        }
        MovementSystem.moveInX(entity, resultingVelocity);
    }


    /**
     * Makes the entity jump
     */
    private void jump(Entity entity) {
        if (entity.hasComponent(JumpComponent.ID)) {
            PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
            JumpComponent jp = (JumpComponent) entity.getComponent(JumpComponent.ID);

            if (jp.getNbJujmps() < jp.getNbJumpsMax()) {
                if (jp.getCooldown().isDone()) {
                    float resultingVelocity = phys.getAcceleration().y * phys.getBody().getGravityScale();
                    MovementSystem.moveInY(entity, resultingVelocity * phys.getBody().getGravityScale());
                    phys.setGrounded(false);
                    jp.setNbJujmps(jp.getNbJujmps() + 1);
                    jp.getCooldown().reset();
                }
            }
        }
    }

    /**
     * Makes the entity fall faster when not on ground
     */ // TODO Tweak to make it better ==> at higher speed it slows you down instead of making you faster
    private void moveDown(Entity entity) {
        PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
        Vector2 vel = phys.getVelocity().cpy();


        if (Math.abs(vel.y) > phys.getMaxSpeed().y) {
            vel.y = -phys.getMaxSpeed().y;
        }
        float resultingVelocity = vel.y - phys.getAcceleration().y * 0.2f * phys.getBody().getGravityScale();
        resultingVelocity = Math.min(resultingVelocity, phys.getVelocity().y);
        // it's half a jump
        MovementSystem.moveInY(entity, resultingVelocity);
    }

    /**
     * Gradually stops the entity by applying deceleration
     * to its velocity
     *
     * @param entity the entity to stop
     */
    private void decelerate(Entity entity) {
        PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
        if (phys.isGrounded()) {
            Vector2 vel = phys.getVelocity();
            // DECELERATION (the character needs to slow down!)
            float finalVel = (vel.x > 0) ?
                    Math.max(vel.x - phys.getAcceleration().x, 0) : Math.min(vel.x + phys.getAcceleration().x, 0);
            MovementSystem.moveInX(entity, finalVel);
        }
    }


}