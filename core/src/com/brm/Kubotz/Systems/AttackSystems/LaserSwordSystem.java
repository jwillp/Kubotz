package com.brm.Kubotz.Systems.AttackSystems;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Components.LifespanComponent;
import com.brm.Kubotz.Components.Parts.Weapons.LaserSwordComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Entities.BulletFactory;
import com.brm.Kubotz.Input.GameButton;

/**
 * Used to handle the entities punching
 */
public class LaserSwordSystem extends EntitySystem{

    public LaserSwordSystem(EntityManager em) {
        super(em);
    }

    @Override
    public void init(){}


    @Override
    public void handleInput() {

        for(Entity entity: em.getEntitiesWithComponent(LaserSwordComponent.ID)){
            VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
            LaserSwordComponent laserSwordComponent = (LaserSwordComponent)entity.getComponent(LaserSwordComponent.ID);
            PhysicsComponent physicsComponent = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);

            //Triggers the punch
            if(gamePad.isButtonPressed(GameButton.PUNCH_BUTTON)){
                if(laserSwordComponent.getCooldown().isDone() && laserSwordComponent.getLaserBox() == null){

                    //CREATE A "PUNCH BULLET"
                    Entity box = this.createHitBox(physicsComponent, laserSwordComponent);
                    laserSwordComponent.setLaserBox(box);
                    ((LifespanComponent)box.getComponent(LifespanComponent.ID)).startLife();
                    laserSwordComponent.getDurationTimer().reset();

                }
            }
        }

    }


    @Override
    public void update(float dt) {
        // See if punch duration is over
        // Update the punch's position according to the puncher's position

        for(Entity entity: em.getEntitiesWithComponent(LaserSwordComponent.ID)){
            LaserSwordComponent laserSwordComponent = (LaserSwordComponent)entity.getComponent(LaserSwordComponent.ID);

            //If the entity is punching
            if(laserSwordComponent.getLaserBox() != null){
                //Check if the punch duration is done, if so hide the punch
                if(laserSwordComponent.getDurationTimer().isDone()){
                    laserSwordComponent.getCooldown().reset();
                    laserSwordComponent.setLaserBox(null);
                }else{


                    //Update pos of Bullet to follow player precisely
                    PhysicsComponent puncherPhys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
                    PhysicsComponent hitbox = (PhysicsComponent) laserSwordComponent.getLaserBox().getComponent(PhysicsComponent.ID);


                    Vector2 position = new Vector2(puncherPhys.getWidth() + 0.45f, 0);
                    if(puncherPhys.getDirection() == PhysicsComponent.Direction.LEFT){
                        position.x *= -1;
                    }

                    position.add(puncherPhys.getBody().getPosition());
                    hitbox.getBody().setTransform(position, hitbox.getBody().getAngle());
                }
            }
        }
    }


    /**
     * Creates a "PUNCH BULLET"
     * @param agentPhys the PhysicsComponent of the puncher
     * @return the new Bullet
     */
    private Entity createHitBox(PhysicsComponent agentPhys, LaserSwordComponent laserSwordComponent){

        // Put the punch at the right place according to the
        // direction the puncher is facing
        Vector2 position = null;
        switch (agentPhys.getDirection()) {
            case RIGHT:
                position = new Vector2(
                        agentPhys.getPosition().x + agentPhys.getWidth() * 2,
                        agentPhys.getPosition().y
                );

                break;
            case LEFT:
                position = new Vector2(
                        agentPhys.getPosition().x - agentPhys.getWidth() * 2,
                        agentPhys.getPosition().y
                );

                break;
        }

        position.add(agentPhys.getPosition());
        return new BulletFactory(this.em, agentPhys.getBody().getWorld(), position)
                .withDamage(laserSwordComponent.getDamage())
                .withSize(agentPhys.getWidth() * 3.0f, agentPhys.getHeight() * 2.1f)
                .withKnockBack(laserSwordComponent.getKnockBack())
                .withLifespan(laserSwordComponent.getDurationTimer().getDelay())
                .withTag(Constants.ENTITY_TAG_PUNCH)
                .withDirection(agentPhys.getDirection())
                .build();
    }
}

