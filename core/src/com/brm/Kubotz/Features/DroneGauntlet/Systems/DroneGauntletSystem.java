package com.brm.Kubotz.Features.DroneGauntlet.Systems;


import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector2;

import com.badlogic.gdx.physics.box2d.CircleShape;
import com.badlogic.gdx.physics.box2d.Fixture;
import com.badlogic.gdx.physics.box2d.FixtureDef;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ECS.core.EntitySystem;
import com.brm.GoatEngine.ECS.common.PhysicsComponent;
import com.brm.GoatEngine.Input.VirtualGamePad;

import com.brm.Kubotz.Features.DroneGauntlet.Components.DroneGauntletComponent;
import com.brm.Kubotz.Features.DroneGauntlet.Entities.DroneFactory;
import com.brm.Kubotz.Common.Hitbox.Hitbox;
import com.brm.Kubotz.Input.GameButton;

/**
 * Turret Gauntlet System
 */
public class DroneGauntletSystem extends EntitySystem {



    @Override
    public void init() {}


    @Override
    public void handleInput() {
        for(Entity entity: getEntityManager().getEntitiesWithComponent(DroneGauntletComponent.ID)){
            if(entity.hasComponentEnabled(VirtualGamePad.ID)){
                handleInputForEntity(entity);
            }

        }
    }

    private void handleInputForEntity(Entity entity){
        VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
        DroneGauntletComponent gauntlet = (DroneGauntletComponent) entity.getComponent(DroneGauntletComponent.ID);
        PhysicsComponent physicsComponent = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);


        if(gamePad.isButtonPressed(GameButton.BUTTON_X)){
            gamePad.releaseButton(GameButton.BUTTON_X);
            //can we spawn a turret?
            if(gauntlet.getCooldown().isDone()){
                if(gauntlet.getDrones().size() < gauntlet.getNbDronesLimint()) {
                    String droneId = this.spawnDrone(physicsComponent, entity).getID();
                    gauntlet.addDrone(droneId);
                    this.createVisionBox(physicsComponent);
                    gauntlet.getCooldown().reset();
                    //TODO fire event DRONE SPAWNED

                }
            }
        }
    }


    @Override
    public void update(float dt) {

        for(Entity entity: getEntityManager().getEntitiesWithComponent(DroneGauntletComponent.ID)){
            DroneGauntletComponent droneComp = (DroneGauntletComponent) entity.getComponent(DroneGauntletComponent.ID);

            // Untrack Dead Drones //TODO maybe respond to events instead
            for(String drone: droneComp.getDrones()){
                if(getEntityManager().getEntity(drone) == null){
                    droneComp.removeDrone(drone);
                }
            }

            if(droneComp.getDrones().isEmpty()){
                //Remove tracker Comp
                removeVisionBox((PhysicsComponent) entity.getComponent(PhysicsComponent.ID));

            }
        }
    }








    private Entity spawnDrone(PhysicsComponent physicsComponent, Entity master){
        Entity turret = new DroneFactory(getEntityManager(),  physicsComponent.getBody().getWorld(), master)
                .withPosition(new Vector2(physicsComponent.getPosition().x - 1, physicsComponent.getPosition().y + 1))
                .withDistance(new Vector2(MathUtils.random(1,2),MathUtils.random(1,2)))
                .withSize(4, 4)
                .build();
        return turret;
    }


    /**
     * Adds an Intangible hitbox to the entity wearing the gauntlet.
     * This will be used by the Drone to know who and when to attack
     * @param phys the PhysicsComponent of the entity to which we add the vision box
     */
    private void createVisionBox(PhysicsComponent phys){

        CircleShape shape = new CircleShape();
        shape.setRadius(phys.getWidth() * 2.5f);

        shape.setPosition(new Vector2(0,0));

        FixtureDef punchFixture = new FixtureDef();
        punchFixture.isSensor = true;
        punchFixture.shape = shape;

        Hitbox hitbox = new Hitbox(Hitbox.Type.Intangible);
        //TODO add a label for more precision on deletion

        phys.getBody().createFixture(punchFixture).setUserData(hitbox);
        shape.dispose();


    }



    /**
     * Removes the vision box
     * @param phys the PhysicsComponent of the entity to which we add the vision box
     */
    private void removeVisionBox(PhysicsComponent phys){
        for(int i=0; i<phys.getBody().getFixtureList().size ;i++){
            Fixture fixture = phys.getBody().getFixtureList().get(i);
            Hitbox hitbox = (Hitbox) fixture.getUserData();
            if(hitbox.type == Hitbox.Type.Intangible) {
                phys.getBody().destroyFixture(fixture);
            }
        }
    }






}