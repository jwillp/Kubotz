package com.brm.Kubotz.Systems.MovementSystems;

import com.badlogic.gdx.Gdx;
import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityContact;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.Skills.Active.FlyComponent;
import com.brm.Kubotz.Component.Skills.DashComponent;
import com.brm.Kubotz.Constants;


/**
 * System handling the controllable Entities such as most characters
 */
public class MovementSystem extends EntitySystem {

    FlySystem flySystem;
    WalkingSystem walkingSystem;
    DashSystem dashSystem;



    public MovementSystem(EntityManager em) {
        super(em);
        flySystem = new FlySystem(em);
        walkingSystem = new WalkingSystem(em);
        dashSystem = new DashSystem(em);
    }


    public void handleInput(){
        for(Entity entity: em.getEntitiesWithComponentEnabled(VirtualGamePad.ID)){
            boolean useDefaultBehaviour = true; //Whether or not we will walk

            // Fly Component
            if(entity.hasComponent(FlyComponent.ID)){
                FlyComponent flyComp = (FlyComponent) entity.getComponent(FlyComponent.ID);
                flySystem.handleInput(entity);
                if(flyComp.isEnabled()){
                    useDefaultBehaviour = false;
                }
            // Dash Component
            }else if(entity.hasComponent(DashComponent.ID)){
                DashComponent dashComp = (DashComponent) entity.getComponent(DashComponent.ID);
                dashSystem.handleInput(entity);
                if(dashComp.isEnabled()){
                    useDefaultBehaviour = dashComp.phase == DashComponent.Phase.RECOVERY;
                }
            }

            //Whether or not we should use the walking behaviour (which is walking)
            if(useDefaultBehaviour){
                walkingSystem.handleInput(entity);
            }
        }



    }



    public void update(){

        this.updateIsGrounded();

        flySystem.update();
        dashSystem.update();
        walkingSystem.update(Gdx.graphics.getDeltaTime());
    }

    /**
     * Updates the property describing if an entity is grounded or not
     */
    public void updateIsGrounded(){


        for(Component comp: em.getComponents(PhysicsComponent.ID)){
            PhysicsComponent phys = (PhysicsComponent) comp;
            for(int i=0; i<phys.contacts.size(); i++){
                EntityContact contact = phys.contacts.get(i);
                if(contact.fixtureA.getUserData() == Constants.FIXTURE_FEET_SENSOR){
                    phys.setGrounded(true);
                    phys.contacts.remove(i);

                    //REMOVE OTHER contact for other entity
                    PhysicsComponent physB = (PhysicsComponent) contact.getEntityB().getComponent(PhysicsComponent.ID);
                    physB.contacts.remove(contact);
                }
            }
        }

    }




    /**
     * Makes an entity move horizontally i.e. on the X axis
     * according to a specified velocity
     * @param entity the entity to move
     * @param velocity the velocity to apply
     */
    public static void moveInX(Entity entity, float velocity){
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        phys.getBody().setLinearVelocity(velocity, phys.getVelocity().y);

        //SET DIRECTION
        if(velocity > 0)
            phys.direction = PhysicsComponent.Direction.RIGHT;
        else if(velocity < 0)
            phys.direction = PhysicsComponent.Direction.LEFT;
    }

    /**
     * Makes an entity move horizontally i.e. on the Y axis
     * according to a specified velocity
     * @param entity the entity to move
     * @param velocity the velocity to apply
     */
    public static void moveInY(Entity entity, float velocity){
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        phys.getBody().setLinearVelocity(phys.getVelocity().x, velocity);
    }

    /**
     * Abruptly stops an entity in X
     * @param entity the entity to stop
     */
    public static void stopX(Entity entity){
        moveInX(entity, 0);
    }

    /**
     * Abruptly stops an entity in Y
     * @param entity the entity to stop
     */
    public static void stopY(Entity entity){
        moveInY(entity, 0);
    }


    /**
     * Stops an entity completely i.e. in X && in Y
     * @param entity the entity to stop
     */
    public static void stopXY(Entity entity){
        stopX(entity);
        stopY(entity);
    }






}
