package com.brm.Kubotz.Systems.MovementSystems;


import com.brm.GoatEngine.ECS.Components.EntityComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityContact;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Input.GameButton;


/**
 * System handling the controllable Entities such as most characters
 */
public class MovementSystem extends EntitySystem {


    public MovementSystem(EntityManager em) {
        super(em);


    }

    @Override
    public void init() {
        getSystemManager().addSystem(RunningSystem.class, new RunningSystem(em));
        getSystemManager().addSystem(FlySystem.class, new FlySystem(em));
        getSystemManager().addSystem(DashSystem.class, new DashSystem(em));
    }



    public void handleInput(){
        getSystemManager().getSystem(FlySystem.class).handleInput();
        getSystemManager().getSystem(DashSystem.class).handleInput();
        getSystemManager().getSystem(RunningSystem.class).handleInput();


        // Set direction
        for(Entity entity: em.getEntitiesWithComponentEnabled(VirtualGamePad.ID)){
            PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
            VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);

            if(gamePad.isButtonPressed(GameButton.MOVE_RIGHT))
                phys.setDirection(PhysicsComponent.Direction.RIGHT);
            else if(gamePad.isButtonPressed(GameButton.MOVE_LEFT))
                phys.setDirection(PhysicsComponent.Direction.LEFT);

        }
    }


    @Override
    public void update(float dt){
        getSystemManager().getSystem(FlySystem.class).update(dt);
        getSystemManager().getSystem(DashSystem.class).update(dt);
        getSystemManager().getSystem(RunningSystem.class).update(dt);
    }



    ///////////////// HELPER METHODS //////////////////////


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
        /*if(velocity > 0)
            phys.setDirection(PhysicsComponent.Direction.RIGHT);
        else if(velocity < 0)
            phys.setDirection(PhysicsComponent.Direction.LEFT);*/
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
