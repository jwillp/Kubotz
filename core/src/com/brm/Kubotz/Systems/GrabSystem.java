package com.brm.Kubotz.Systems;

import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.CircleShape;
import com.badlogic.gdx.physics.box2d.Fixture;
import com.badlogic.gdx.physics.box2d.FixtureDef;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Entity.Event;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Components.GrabComponent;
import com.brm.Kubotz.Components.GrabbableComponent;
import com.brm.Kubotz.Components.LifespanComponent;
import com.brm.Kubotz.Components.MeleeComponent;
import com.brm.Kubotz.Components.Powerups.PowerUpComponent;
import com.brm.Kubotz.Components.Powerups.PowerUpsContainerComponent;
import com.brm.Kubotz.Config;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Events.CollisionEvent;
import com.brm.Kubotz.Hitbox.Hitbox;
import com.brm.Kubotz.Input.GameButton;

/**
 * Used to handle all the entities with Grab/GrabbableComponents
 */
public class GrabSystem extends EntitySystem{


    public GrabSystem(){}

    @Override
    public void init(){}

    @Override
    public void update(float dt) {
        //See if the grabbing duration is over
        for(Entity entity: getEntityManager().getEntitiesWithComponentEnabled(GrabComponent.ID)){
            GrabComponent grabComp = (GrabComponent)entity.getComponent(GrabComponent.ID);
            //Check if the grab duration is over, if so destroy the grab box
            if(grabComp.getDurationTimer().isDone()){
                grabComp.getCooldown().reset();
                removeGrabBox((PhysicsComponent) entity.getComponent(PhysicsComponent.ID));
            }
        }
    }


    public void handleInput(){
        for(Entity entity: getEntityManager().getEntitiesWithComponentEnabled(GrabComponent.ID)) {
            if(entity.hasComponentEnabled(VirtualGamePad.ID)) {
                handleInputForEntity(entity);
            }
        }
    }

    private void handleInputForEntity(Entity entity){
        VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
        GrabComponent grabComp = (GrabComponent)entity.getComponent(GrabComponent.ID);
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);

        //Triggers the punch
        if(gamePad.isButtonPressed(GameButton.BUTTON_B)){

            if(grabComp.getCooldown().isDone() && grabComp.getDurationTimer().isDone()){
                createGrabBox(phys);
                grabComp.getDurationTimer().reset();
                // TODO FIRE EVENT FOR GRAB_ATTEMPT

            }
        }
    }



    /**
     * Makes an entity pickup an object
     * @param agent the entity that will pick the object up
     * @param grabbable the object to be picked up
     */
    private void pickupObject(Entity agent, Entity grabbable){
        //Perform correct acction according to the grabbed object

        //Grab PowerUp
        if(grabbable.hasComponent(PowerUpComponent.ID)){
            PowerUpComponent powerUpComp = (PowerUpComponent) grabbable.getComponent(PowerUpComponent.ID);
            PowerUpsContainerComponent container;
            container = (PowerUpsContainerComponent) agent.getComponent(PowerUpsContainerComponent.ID);
            container.addPowerUp(powerUpComp.getPowerUp());
            powerUpComp.getPowerUp().getEffect().onStart(agent);
            LifespanComponent life = (LifespanComponent) grabbable.getComponent(LifespanComponent.ID);
            life.getCounter().terminate();

            //TODO Fire Event
        }

        //Grab Ennemy
        // TODO Grab ennemy
    }

    @Override
    public <T extends Event> void onEvent(T event) {
        if(event.getClass() == CollisionEvent.class){
            this.onCollision((CollisionEvent) event);
        }
    }


    /**
     * Called on Collision
     * Tries handle a collision between a something and a Grab hitbox
     */
    private void onCollision(CollisionEvent contact){
        if(contact.getDescriber() == CollisionEvent.Describer.BEGIN){
            if(contact.getEntityA() != null && contact.getEntityB() != null){
                Hitbox hitbox = (Hitbox) contact.getFixtureA().getUserData();
                if(hitbox.type == Hitbox.Type.Grab){
                    this.pickupObject(contact.getEntityA(), contact.getEntityB());
                }
            }
        }
    }




    /**
     * Creates a grab box
     * @param phys
     */
    private void createGrabBox(PhysicsComponent phys) {
        CircleShape shape = new CircleShape();
        shape.setRadius(phys.getWidth() * 2f);


        shape.setPosition(new Vector2(0,0));

        FixtureDef punchFixture = new FixtureDef();
        punchFixture.isSensor = true;
        punchFixture.shape = shape;

        Hitbox hitbox = new Hitbox(Hitbox.Type.Grab);



        phys.getBody().createFixture(punchFixture).setUserData(hitbox);
        shape.dispose();
    }


    /**
     * Removes the grab box
     * @param phys
     */
    private void removeGrabBox(PhysicsComponent phys) {
        for(int i=0; i<phys.getBody().getFixtureList().size ;i++){
            Fixture fixture = phys.getBody().getFixtureList().get(i);
            Hitbox hitbox = (Hitbox) fixture.getUserData();
            if(hitbox.type == Hitbox.Type.Grab) {
                phys.getBody().destroyFixture(fixture);
            }
        }
    }




}
