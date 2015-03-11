package com.brm.Kubotz.Systems;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.LifespanComponent;
import com.brm.Kubotz.Component.PunchComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Entities.BulletFactory;
import com.brm.Kubotz.Input.GameButton;
import com.sun.xml.internal.bind.v2.runtime.reflect.opt.Const;

/**
 * Used to handle the entities punching
 */
public class PunchSystem extends EntitySystem{

    public PunchSystem(EntityManager em) {
        super(em);
    }



    @Override
    public void handleInput() {

        for(Entity entity: em.getEntitiesWithComponent(PunchComponent.ID)){
            VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
            PunchComponent punchComponent = (PunchComponent)entity.getComponent(PunchComponent.ID);
            PhysicsComponent physicsComponent = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);

            //Triggers the punch
            if(gamePad.isButtonPressed(GameButton.PUNCH_BUTTON)){
              if(punchComponent.cooldown.isDone() && punchComponent.punchBullet == null){

                  //CREATE A "PUNCH BULLET"
                  Entity bullet = this.createBullet(physicsComponent, punchComponent);
                  punchComponent.punchBullet = bullet;
                  ((LifespanComponent)bullet.getComponent(LifespanComponent.ID)).starLife();
                  punchComponent.durationTimer.reset();

              }
            }
        }

    }



    public void update() {
        // See if punch duration is over
        // Update the punch's position according to the puncher's position

        for(Entity entity: em.getEntitiesWithComponent(PunchComponent.ID)){
            PunchComponent punchComponent = (PunchComponent)entity.getComponent(PunchComponent.ID);

                //If the entity is punching
                if(punchComponent.punchBullet != null){
                    //Check if the punch duration is done, if so hide the punch
                    if(punchComponent.durationTimer.isDone()){
                        punchComponent.cooldown.reset();
                        punchComponent.punchBullet = null;
                    }else{


                        //Update pos of Bullet to follow player precisely
                        PhysicsComponent puncherPhys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
                        PhysicsComponent bulletPhys = (PhysicsComponent)punchComponent.punchBullet.getComponent(PhysicsComponent.ID);


                        Vector2 position = new Vector2(puncherPhys.getWidth() + 0.45f, 0);
                        if(puncherPhys.direction == PhysicsComponent.Direction.LEFT){
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
        switch (phys.direction) {
            case RIGHT:
                position = new Vector2(phys.getWidth() + phys.getWidth()/2, 0);
                break;
            case LEFT:
                position = new Vector2(-phys.getWidth()-phys.getWidth()/2, 0);
                break;
        }

        position.add(phys.getPosition());
        return new BulletFactory(this.em, phys.getBody().getWorld(), position)
                .withDamage(punchComponent.damage)
                .withSize(phys.getWidth() * 0.5f, phys.getWidth() * 0.5f)
                .withKnockBack(punchComponent.knockBack)
                .withLifespan(punchComponent.durationTimer.getDelay())
                .withTag(Constants.ENTITY_TAG_PUNCH)
                .withDirection(phys.direction)
                .build();



    }






}

