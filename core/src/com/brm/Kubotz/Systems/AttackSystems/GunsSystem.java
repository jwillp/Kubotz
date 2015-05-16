package com.brm.Kubotz.Systems.AttackSystems;



import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Component.Parts.Weapons.GunComponent;
import com.brm.Kubotz.Component.LifespanComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Entities.BulletFactory;
import com.brm.Kubotz.Input.GameButton;

/**
 * Used to update entities using a gun
 */
public class GunsSystem extends EntitySystem {


    public GunsSystem(EntityManager em) {
        super(em);
    }

    @Override
    public void init() {}

    @Override
    public void update(float dt) {}


    @Override
    public void handleInput() {

        for(Entity entity: em.getEntitiesWithComponent(GunComponent.ID){

    }



    private void handleInputForEntity(Entity entity){
        for(Entity entity: em.getEntitiesWithComponent(GunComponent.getId())){
            VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
            GunComponent gunComponent = (GunComponent) entity.getComponent(GunComponent.getId());
            PhysicsComponent physicsComponent = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);

            if(gamePad.isButtonPressed(GameButton.PRIMARY_ACTION_BUTTON)){
                Logger.log("SHOOT");
                gamePad.releaseButton(GameButton.PRIMARY_ACTION_BUTTON);
                //can we shoot?
                if(gunComponent.getCooldown().isDone()){
                    Logger.log("SHOOT");
                    //CREATE A BULLET
                    Entity bullet = this.createBullet(physicsComponent, gunComponent);
                    ((LifespanComponent)bullet.getComponent(LifespanComponent.ID)).starLife();
                    gunComponent.getCooldown().reset();

                }

            }
        }

    }




    /**
     * Creates a Gun Bullet
     * @param phys the PhysicsComponent of the puncher
     * @return the new Bullet
     */
    private Entity createBullet(PhysicsComponent phys, GunComponent gunComponent){

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
                .withDamage(gunComponent.getDamage())
                .withSize(1, phys.getWidth() * 0.5f)
                .withKnockBack(gunComponent.getKnockBack())
                .withLifespan(Timer.INFINITE)
                .withTag(Constants.ENTITY_TAG_PUNCH)
                .withDirection(phys.direction)
                .withSpeed(gunComponent.getBulletSpeed())
                .build();
    }













}