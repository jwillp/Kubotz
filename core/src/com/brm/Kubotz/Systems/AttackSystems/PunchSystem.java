package com.brm.Kubotz.Systems.AttackSystems;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Components.LifespanComponent;
import com.brm.Kubotz.Components.PunchComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Entities.BulletFactory;
import com.brm.Kubotz.Input.GameButton;

/**
 * Used to handle the entities punching
 */
public class PunchSystem extends EntitySystem{

    public PunchSystem() {
    }

    @Override
    public void init(){}


    @Override
    public void handleInput() {

        for(Entity entity: getEntityManager().getEntitiesWithComponentEnabled(PunchComponent.ID)) {
            if(entity.hasComponentEnabled(VirtualGamePad.ID)) {
                handleInputForEntity(entity);
            }
        }


    }





    private void handleInputForEntity(Entity entity){
        VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
        PunchComponent punchComponent = (PunchComponent)entity.getComponent(PunchComponent.ID);
        PhysicsComponent physicsComponent = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);

        //Triggers the punch
        if(gamePad.isButtonPressed(GameButton.PUNCH_BUTTON)){
            if(punchComponent.getCooldown().isDone() && punchComponent.getPunchBullet() == null){

                //CREATE A "PUNCH BULLET"
                Entity bullet = this.createBullet(physicsComponent, punchComponent);
                punchComponent.setPunchBullet(bullet);
                ((LifespanComponent)bullet.getComponent(LifespanComponent.ID)).startLife();
                punchComponent.getDurationTimer().reset();

            }
        }
    }



    public void update(float dt) {
        // See if punch duration is over
        // Update the punch's position according to the puncher's position

        for(Entity entity: getEntityManager().getEntitiesWithComponentEnabled(PunchComponent.ID)){
            PunchComponent punchComponent = (PunchComponent)entity.getComponent(PunchComponent.ID);

                //If the entity is punching
                if(punchComponent.getPunchBullet() != null){
                    //Check if the punch duration is done, if so hide the punch
                    if(punchComponent.getDurationTimer().isDone()){
                        punchComponent.getCooldown().reset();
                        punchComponent.setPunchBullet(null);
                    }else{


                        //Update pos of Bullet to follow player precisely
                        PhysicsComponent puncherPhys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
                        PhysicsComponent bulletPhys = (PhysicsComponent) punchComponent.getPunchBullet().getComponent(PhysicsComponent.ID);


                        Vector2 position = new Vector2(puncherPhys.getWidth() + 0.45f, 0);
                        if(puncherPhys.getDirection() == PhysicsComponent.Direction.LEFT){
                            position.x *= -1;
                        }

                        position.add(puncherPhys.getBody().getPosition());
                        bulletPhys.getBody().setTransform(position, bulletPhys.getBody().getAngle());
                    }
                }
        }

    }


    /**
     * Creates a "PUNCH BULLET"
     * @param phys the PhysicsComponent of the puncher
     * @return the new Bullet
     */
    private Entity createBullet(PhysicsComponent phys, PunchComponent punchComponent){

        // Put the punch at the right place according to the
        // direction the puncher is facing
        Vector2 position = null;
        switch (phys.getDirection()) {
            case RIGHT:
                position = new Vector2(phys.getWidth() + phys.getWidth()/2, 0);
                break;
            case LEFT:
                position = new Vector2(-phys.getWidth()-phys.getWidth()/2, 0);
                break;
        }

        position.add(phys.getPosition());
        return new BulletFactory(this.getEntityManager(), phys.getBody().getWorld(), position)
                .withDamage(punchComponent.getDamage())
                .withSize(phys.getWidth() * 0.5f, phys.getWidth() * 0.5f)
                .withKnockBack(punchComponent.getKnockBack())
                .withLifespan(punchComponent.getDurationTimer().getDelay())
                .withTag(Constants.ENTITY_TAG_PUNCH)
                .withDirection(phys.getDirection())
                .build();



    }












}

